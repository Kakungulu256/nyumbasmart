import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { dbService, Query } from '@/services/appwrite/db'

const ACTIVE_APPLICATION_STATUSES = ['pending', 'accepted']

function buildApplicationPermissions(tenantId, landlordId) {
  return [
    Permission.read(Role.user(tenantId)),
    Permission.read(Role.user(landlordId)),
    Permission.update(Role.user(tenantId)),
    Permission.update(Role.user(landlordId)),
    Permission.delete(Role.user(tenantId)),
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
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [Query.equal('tenantId', tenantId), Query.orderDesc('$createdAt'), Query.limit(100)],
    })

    return response.documents
  },

  listLandlordApplications: async ({ landlordId }) => {
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [Query.equal('landlordId', landlordId), Query.orderDesc('$createdAt'), Query.limit(100)],
    })

    return response.documents
  },

  hasActiveApplicationForListing: async ({ tenantId, listingId }) => {
    const response = await dbService.listDocuments({
      collectionId: collections.applications,
      queries: [
        Query.equal('tenantId', tenantId),
        Query.equal('listingId', listingId),
        Query.equal('status', ACTIVE_APPLICATION_STATUSES),
        Query.limit(1),
      ],
    })

    return response.documents.length > 0
  },

  submitApplication: async ({ tenantId, landlordId, listingId, moveInDate = '', coverNote = '' }) => {
    const hasActive = await applicationsService.hasActiveApplicationForListing({
      tenantId,
      listingId,
    })

    if (hasActive) {
      throw new Error('You already have an active application for this property.')
    }

    return dbService.createDocument({
      collectionId: collections.applications,
      data: {
        listingId,
        tenantId,
        landlordId,
        status: 'pending',
        moveInDate: toIsoDateOrNull(moveInDate),
        coverNote: String(coverNote || '').trim(),
        tenantDocFileIds: [],
        createdAt: new Date().toISOString(),
      },
      permissions: buildApplicationPermissions(tenantId, landlordId),
    })
  },

  withdrawApplication: async ({ application }) => {
    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be withdrawn.')
    }

    return dbService.updateDocument({
      collectionId: collections.applications,
      documentId: application.$id,
      data: {
        status: 'withdrawn',
      },
    })
  },

  acceptApplication: async ({ application }) => {
    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be accepted.')
    }

    return dbService.updateDocument({
      collectionId: collections.applications,
      documentId: application.$id,
      data: {
        status: 'accepted',
      },
    })
  },

  rejectApplication: async ({ application }) => {
    if (application.status !== 'pending') {
      throw new Error('Only pending applications can be rejected.')
    }

    return dbService.updateDocument({
      collectionId: collections.applications,
      documentId: application.$id,
      data: {
        status: 'rejected',
      },
    })
  },
}
