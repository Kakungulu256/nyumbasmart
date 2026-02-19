import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { notificationsService } from '@/features/notifications/services/notificationsService'
import { dbService, Query } from '@/services/appwrite/db'
import { ensureSafeId, sanitizeTextInput } from '@/utils/security'

const ACTIVE_APPLICATION_STATUSES = ['pending', 'accepted']

export function buildApplicationPermissions(tenantId, landlordId) {
  const safeTenantId = ensureSafeId(tenantId, 'Tenant ID')
  const safeLandlordId = ensureSafeId(landlordId, 'Landlord ID')

  return [
    Permission.read(Role.user(safeTenantId)),
    Permission.read(Role.user(safeLandlordId)),
    Permission.update(Role.user(safeTenantId)),
    Permission.update(Role.user(safeLandlordId)),
    Permission.delete(Role.user(safeTenantId)),
  ]
}

function toIsoDateOrNull(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export const applicationsService = {
  listTenantApplications: async ({ tenantId }) => {
    const safeTenantId = ensureSafeId(tenantId, 'Tenant ID')
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [Query.equal('tenantId', safeTenantId), Query.orderDesc('$createdAt'), Query.limit(100)],
    })

    return response.documents
  },

  listLandlordApplications: async ({ landlordId }) => {
    const safeLandlordId = ensureSafeId(landlordId, 'Landlord ID')
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [Query.equal('landlordId', safeLandlordId), Query.orderDesc('$createdAt'), Query.limit(100)],
    })

    return response.documents
  },

  hasActiveApplicationForListing: async ({ tenantId, listingId }) => {
    const safeTenantId = ensureSafeId(tenantId, 'Tenant ID')
    const safeListingId = ensureSafeId(listingId, 'Listing ID')
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [
        Query.equal('tenantId', safeTenantId),
        Query.equal('listingId', safeListingId),
        Query.equal('status', ACTIVE_APPLICATION_STATUSES),
        Query.limit(1),
      ],
    })

    return response.documents.length > 0
  },

  submitApplication: async ({ tenantId, landlordId, listingId, moveInDate = '', coverNote = '' }) => {
    const safeTenantId = ensureSafeId(tenantId, 'Tenant ID')
    const safeLandlordId = ensureSafeId(landlordId, 'Landlord ID')
    const safeListingId = ensureSafeId(listingId, 'Listing ID')

    const hasActive = await applicationsService.hasActiveApplicationForListing({
      tenantId: safeTenantId,
      listingId: safeListingId,
    })

    if (hasActive) {
      throw new Error('You already have an active application for this property.')
    }

    const createdApplication = await dbService.createDocument({
      collectionId: collections.applications,
      data: {
        listingId: safeListingId,
        tenantId: safeTenantId,
        landlordId: safeLandlordId,
        status: 'pending',
        moveInDate: toIsoDateOrNull(moveInDate),
        coverNote: sanitizeTextInput(coverNote, {
          maxLength: 1200,
          allowMultiline: true,
        }),
        tenantDocFileIds: [],
        createdAt: new Date().toISOString(),
      },
      permissions: buildApplicationPermissions(safeTenantId, safeLandlordId),
    })

    try {
      await notificationsService.createNotification({
        userId: safeLandlordId,
        type: 'application_new',
        title: 'New rental application',
        body: 'A tenant submitted a new application to one of your listings.',
        entityType: 'application',
        entityId: createdApplication.$id,
      })
    } catch {
      // Non-blocking notification failure.
    }

    return createdApplication
  },

  withdrawApplication: async ({ application }) => {
    if (!application) {
      throw new Error('Application payload is required.')
    }

    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be withdrawn.')
    }

    return dbService.updateDocument({
      collectionId: collections.applications,
      documentId: ensureSafeId(application.$id, 'Application ID'),
      data: {
        status: 'withdrawn',
      },
    })
  },

  acceptApplication: async ({ application }) => {
    if (!application) {
      throw new Error('Application payload is required.')
    }

    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be accepted.')
    }

    const updatedApplication = await dbService.updateDocument({
      collectionId: collections.applications,
      documentId: ensureSafeId(application.$id, 'Application ID'),
      data: {
        status: 'accepted',
      },
    })

    try {
      await notificationsService.createNotification({
        userId: application.tenantId,
        type: 'application_accepted',
        title: 'Application accepted',
        body: 'Your application was accepted by the landlord.',
        entityType: 'application',
        entityId: application.$id,
      })
    } catch {
      // Non-blocking notification failure.
    }

    return updatedApplication
  },

  rejectApplication: async ({ application }) => {
    if (!application) {
      throw new Error('Application payload is required.')
    }

    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be rejected.')
    }

    const updatedApplication = await dbService.updateDocument({
      collectionId: collections.applications,
      documentId: ensureSafeId(application.$id, 'Application ID'),
      data: {
        status: 'rejected',
      },
    })

    try {
      await notificationsService.createNotification({
        userId: application.tenantId,
        type: 'application_rejected',
        title: 'Application update',
        body: 'Your application was not accepted by the landlord.',
        entityType: 'application',
        entityId: application.$id,
      })
    } catch {
      // Non-blocking notification failure.
    }

    return updatedApplication
  },
}
