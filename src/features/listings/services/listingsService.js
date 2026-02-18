import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { dbService, Query } from '@/services/appwrite/db'

function buildListingPermissions({ landlordId, isPublished }) {
  const permissions = [
    Permission.read(Role.user(landlordId)),
    Permission.update(Role.user(landlordId)),
    Permission.delete(Role.user(landlordId)),
  ]

  if (isPublished) {
    permissions.unshift(Permission.read(Role.any()))
  }

  return permissions
}

function formatArrayInput(rawValue) {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toIsoStringOrNull(value) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function normalizeListingPayload(values, status) {
  const imageFileIds = Array.isArray(values.imageFileIds)
    ? values.imageFileIds.map((value) => String(value || '').trim()).filter(Boolean)
    : formatArrayInput(values.imageFileIdsText)

  return {
    landlordId: values.landlordId,
    title: values.title.trim(),
    description: values.description.trim(),
    propertyType: values.propertyType,
    rentAmount: Number(values.rentAmount),
    currency: values.currency.trim().toUpperCase(),
    paymentFrequency: values.paymentFrequency,
    bedrooms: Number(values.bedrooms),
    bathrooms: Number(values.bathrooms),
    amenities: formatArrayInput(values.amenitiesText),
    imageFileIds,
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    address: values.address.trim(),
    neighborhood: values.neighborhood.trim(),
    city: values.city.trim(),
    country: values.country.trim().toUpperCase(),
    status,
    availableFrom: toIsoStringOrNull(values.availableFrom),
    updatedAt: new Date().toISOString(),
  }
}

export const listingsService = {
  listPublicListings: async ({ filters = {}, page = 1, limit = 9, mode = 'paged' } = {}) => {
    const queries = [Query.equal('status', 'available')]

    const keyword = String(filters.keyword || '').trim()
    const city = String(filters.city || '').trim()
    const propertyType = String(filters.propertyType || '').trim()

    if (keyword) {
      queries.push(Query.search('title', keyword))
    }

    if (city) {
      queries.push(Query.equal('city', city))
    }

    if (propertyType && propertyType !== 'all') {
      queries.push(Query.equal('propertyType', propertyType))
    }

    if (filters.minRent !== '' && filters.minRent !== null && filters.minRent !== undefined) {
      const minRent = Number(filters.minRent)
      if (Number.isFinite(minRent)) {
        queries.push(Query.greaterThanEqual('rentAmount', minRent))
      }
    }

    if (filters.maxRent !== '' && filters.maxRent !== null && filters.maxRent !== undefined) {
      const maxRent = Number(filters.maxRent)
      if (Number.isFinite(maxRent)) {
        queries.push(Query.lessThanEqual('rentAmount', maxRent))
      }
    }

    queries.push(Query.orderDesc('$updatedAt'))

    if (mode === 'all') {
      const batchSize = Math.min(Math.max(10, limit), 100)
      const allDocuments = []
      let total = 0
      let offset = 0
      let hasMore = true
      let guard = 0

      while (hasMore && guard < 50) {
        const response = await dbService.listDocuments({
          collectionId: collections.listings,
          queries: [...queries, Query.limit(batchSize), Query.offset(offset)],
        })

        total = response.total
        allDocuments.push(...response.documents)
        offset += response.documents.length
        guard += 1
        hasMore = offset < total && response.documents.length > 0
      }

      return {
        documents: allDocuments,
        total,
      }
    }

    const response = await dbService.listDocuments({
      collectionId: collections.listings,
      queries: [...queries, Query.limit(limit), Query.offset(Math.max(0, (page - 1) * limit))],
    })

    return {
      documents: response.documents,
      total: response.total,
    }
  },

  listLandlordListings: async ({ landlordId }) => {
    const response = await dbService.listDocuments({
      collectionId: collections.listings,
      queries: [Query.equal('landlordId', landlordId), Query.orderDesc('$updatedAt'), Query.limit(100)],
    })

    return response.documents
  },

  getListingById: async ({ listingId }) =>
    dbService.getDocument({
      collectionId: collections.listings,
      documentId: listingId,
    }),

  createListing: async ({ landlordId, values, status = 'draft' }) => {
    const payload = normalizeListingPayload({ ...values, landlordId }, status)
    payload.createdAt = new Date().toISOString()

    return dbService.createDocument({
      collectionId: collections.listings,
      data: payload,
      permissions: buildListingPermissions({
        landlordId,
        isPublished: status === 'available',
      }),
    })
  },

  updateListing: async ({ listingId, landlordId, values, status = 'draft' }) =>
    dbService.updateDocument({
      collectionId: collections.listings,
      documentId: listingId,
      data: normalizeListingPayload({ ...values, landlordId }, status),
      permissions: buildListingPermissions({
        landlordId,
        isPublished: status === 'available',
      }),
    }),

  setListingPublication: async ({ listingId, landlordId, publish }) =>
    dbService.updateDocument({
      collectionId: collections.listings,
      documentId: listingId,
      data: {
        status: publish ? 'available' : 'draft',
        updatedAt: new Date().toISOString(),
      },
      permissions: buildListingPermissions({
        landlordId,
        isPublished: publish,
      }),
    }),
}
