import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { dbService, Query } from '@/services/appwrite/db'
import { ensureFiniteNumber, ensureSafeId, sanitizeCode, sanitizeStringArray, sanitizeTextInput } from '@/utils/security'

const VALID_LISTING_STATUSES = ['available', 'occupied', 'draft', 'suspended']
const VALID_PROPERTY_TYPES = ['apartment', 'house', 'room', 'studio', 'commercial']
const VALID_PAYMENT_FREQUENCIES = ['monthly', 'quarterly', 'annually']

export function buildListingPermissions({ landlordId, isPublished }) {
  const safeLandlordId = ensureSafeId(landlordId, 'Landlord ID')
  const permissions = [
    Permission.read(Role.user(safeLandlordId)),
    Permission.update(Role.user(safeLandlordId)),
    Permission.delete(Role.user(safeLandlordId)),
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
  const normalizedStatus = String(status || 'draft').trim()
  if (!VALID_LISTING_STATUSES.includes(normalizedStatus)) {
    throw new Error('Listing status is invalid.')
  }

  const propertyType = String(values.propertyType || '').trim()
  if (!VALID_PROPERTY_TYPES.includes(propertyType)) {
    throw new Error('Property type is invalid.')
  }

  const paymentFrequency = String(values.paymentFrequency || '').trim()
  if (!VALID_PAYMENT_FREQUENCIES.includes(paymentFrequency)) {
    throw new Error('Payment frequency is invalid.')
  }

  const imageFileIds = Array.isArray(values.imageFileIds)
    ? values.imageFileIds.map((value) => String(value || '').trim()).filter(Boolean)
    : formatArrayInput(values.imageFileIdsText)

  const title = sanitizeTextInput(values.title, { maxLength: 140 })
  const description = sanitizeTextInput(values.description, { maxLength: 2000, allowMultiline: true })
  const address = sanitizeTextInput(values.address, { maxLength: 240 })
  const city = sanitizeTextInput(values.city, { maxLength: 80 })

  if (!title) {
    throw new Error('Listing title is required.')
  }

  if (!description) {
    throw new Error('Listing description is required.')
  }

  if (!address) {
    throw new Error('Listing address is required.')
  }

  if (!city) {
    throw new Error('Listing city is required.')
  }

  return {
    landlordId: ensureSafeId(values.landlordId, 'Landlord ID'),
    title,
    description,
    propertyType,
    rentAmount: ensureFiniteNumber(values.rentAmount, { label: 'Rent amount', integer: true, min: 0 }),
    currency: sanitizeCode(values.currency, { label: 'Currency code', exactLength: 3 }),
    paymentFrequency,
    bedrooms: ensureFiniteNumber(values.bedrooms, { label: 'Bedrooms', integer: true, min: 0, max: 20 }),
    bathrooms: ensureFiniteNumber(values.bathrooms, { label: 'Bathrooms', integer: true, min: 0, max: 20 }),
    amenities: sanitizeStringArray(formatArrayInput(values.amenitiesText), { maxItems: 30, maxItemLength: 50 }),
    imageFileIds: sanitizeStringArray(imageFileIds, { maxItems: 12, maxItemLength: 64 }).map((fileId) =>
      ensureSafeId(fileId, 'Image file ID'),
    ),
    latitude: ensureFiniteNumber(values.latitude, { label: 'Latitude', min: -90, max: 90 }),
    longitude: ensureFiniteNumber(values.longitude, { label: 'Longitude', min: -180, max: 180 }),
    address,
    neighborhood: sanitizeTextInput(values.neighborhood, { maxLength: 120 }),
    city,
    country: sanitizeCode(values.country, { label: 'Country code', exactLength: 2 }),
    status: normalizedStatus,
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
      queries: [Query.equal('landlordId', ensureSafeId(landlordId, 'Landlord ID')), Query.orderDesc('$updatedAt'), Query.limit(100)],
    })

    return response.documents
  },

  getListingById: async ({ listingId }) =>
    dbService.getDocument({
      collectionId: collections.listings,
      documentId: ensureSafeId(listingId, 'Listing ID'),
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
      documentId: ensureSafeId(listingId, 'Listing ID'),
      data: normalizeListingPayload({ ...values, landlordId }, status),
      permissions: buildListingPermissions({
        landlordId,
        isPublished: status === 'available',
      }),
    }),

  setListingPublication: async ({ listingId, landlordId, publish }) =>
    dbService.updateDocument({
      collectionId: collections.listings,
      documentId: ensureSafeId(listingId, 'Listing ID'),
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
