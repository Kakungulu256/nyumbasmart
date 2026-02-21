import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Avatar, Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { ListingsMapView } from '@/features/listings/components/ListingsMapView'
import { getDistrictOptionsForRegion, getLandTenureLabel, getRegionLabel, ugandaLandTenureOptions, ugandaRegionOptions } from '@/features/listings/constants/ugandaLandMetadata'
import { listingsService } from '@/features/listings/services/listingsService'
import { propertyTypeOptions } from '@/features/listings/utils/listingForm'
import { calculateDistanceKm, toNumberOrNull } from '@/features/listings/utils/geo'
import { buckets } from '@/constants/buckets'
import { collections } from '@/constants/collections'
import { dbService, Query } from '@/services/appwrite/db'
import { storageService } from '@/services/appwrite/storage'
import { formatCurrency } from '@/utils/currency'

const PAGE_SIZE = 9
const RECENT_UPDATE_WINDOW_DAYS = 14
const MARKET_MODE_OPTIONS = ['buy', 'rent']

const marketModePropertyTypes = {
  buy: ['house', 'land', 'apartment', 'duplex', 'commercial'],
  rent: ['house', 'land', 'apartment', 'duplex', 'studio', 'room', 'commercial'],
}

const LISTING_CATEGORY_VALUES = new Set(['property', 'land'])

const emptyFilters = {
  keyword: '',
  listingCategory: 'property',
  city: '',
  region: '',
  district: '',
  landTenureType: '',
  propertyType: 'all',
  minRent: '',
  maxRent: '',
  radiusKm: '',
  sortBy: 'latest',
}

function imageUrlForListing(listing) {
  if (!Array.isArray(listing.imageFileIds) || listing.imageFileIds.length === 0) {
    return ''
  }

  const fileId = listing.imageFileIds[0]
  const viewUrl = storageService.getFileView({
    bucketId: buckets.listingImages,
    fileId,
  })

  return typeof viewUrl === 'string' ? viewUrl : viewUrl.toString()
}

function avatarUrlForProfile(profile) {
  if (!profile?.avatarFileId) {
    return ''
  }

  const viewUrl = storageService.getFileView({
    bucketId: buckets.avatars,
    fileId: profile.avatarFileId,
  })

  return typeof viewUrl === 'string' ? viewUrl : viewUrl.toString()
}

function formatLandlordName(profile) {
  const firstName = String(profile?.firstName || '').trim()
  const lastName = String(profile?.lastName || '').trim()
  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) {
    return fullName
  }

  if (lastName) {
    return lastName
  }

  if (firstName) {
    return firstName
  }

  return 'Landlord'
}

function isRecentlyUpdated(listing) {
  const value = listing.updatedAt || listing.$updatedAt
  if (!value) {
    return false
  }

  const updatedAt = new Date(value).getTime()
  if (!Number.isFinite(updatedAt)) {
    return false
  }

  const maxAgeMs = RECENT_UPDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - updatedAt <= maxAgeMs
}

function formatDateLabel(value) {
  if (!value) {
    return 'Immediate'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Immediate'
  }

  return parsedDate.toLocaleDateString()
}

function toTitleCase(value, fallback = '') {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return fallback
  }

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

function toMarketMode(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return MARKET_MODE_OPTIONS.includes(normalized) ? normalized : 'rent'
}

function toListingIntentLabel(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'sale' ? 'For Sale' : 'For Rent'
}

function toListingCategory(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return LISTING_CATEGORY_VALUES.has(normalized) ? normalized : 'property'
}

function ListingCard({
  listing,
  landlordProfile = null,
  canSave = false,
  isSaved = false,
  onToggleSave,
  isCompared = false,
  onToggleCompare,
}) {
  const previewUrl = imageUrlForListing(listing)
  const listingDetailPath = `/listings/${listing.$id}`
  const shortDescription = String(listing.description || '').slice(0, 120)
  const hasDistance = Number.isFinite(listing.distanceKm)
  const landlordName = formatLandlordName(landlordProfile)
  const landlordAvatar = avatarUrlForProfile(landlordProfile)
  const recentlyUpdated = isRecentlyUpdated(listing)
  const bedrooms = Number.isFinite(Number(listing.bedrooms)) ? Number(listing.bedrooms) : null
  const bathrooms = Number.isFinite(Number(listing.bathrooms)) ? Number(listing.bathrooms) : null
  const listingIntentLabel = toListingIntentLabel(listing.listingIntent)

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        <Link className="relative h-52 w-full shrink-0 bg-slate-100 sm:h-auto sm:w-60 lg:w-64" to={listingDetailPath}>
          {previewUrl ? (
            <img alt={listing.title} className="h-full w-full object-cover" src={previewUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant="info">{listingIntentLabel}</Badge>
            {recentlyUpdated && <Badge variant="success">Updated</Badge>}
          </div>
        </Link>

        <CardBody className="flex-1 space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{toTitleCase(listing.paymentFrequency, 'Monthly')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => onToggleCompare?.(listing.$id)} size="sm" type="button" variant={isCompared ? 'secondary' : 'ghost'}>
                {isCompared ? 'Compared' : 'Compare'}
              </Button>
              {canSave && (
                <Button onClick={() => onToggleSave?.(listing.$id)} size="sm" type="button" variant={isSaved ? 'secondary' : 'ghost'}>
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              )}
            </div>
          </div>

          <Link className="block" to={listingDetailPath}>
            <h3 className="line-clamp-1 text-base font-semibold text-slate-900 hover:text-blue-700">{listing.title}</h3>
          </Link>
          <p className="text-sm text-slate-600">
            {listing.address ? `${listing.address}, ` : ''}
            {listing.city}, {listing.country}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
            <span>{bedrooms ?? '--'} bd</span>
            <span className="text-slate-300">|</span>
            <span>{bathrooms ?? '--'} ba</span>
            <span className="text-slate-300">|</span>
            <span>{toTitleCase(listing.propertyType, '--')}</span>
            {hasDistance && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-blue-700">{listing.distanceKm.toFixed(1)} km away</span>
              </>
            )}
          </div>

          <p className="line-clamp-2 text-sm text-slate-500">
            {shortDescription}
            {String(listing.description || '').length > 120 ? '...' : ''}
          </p>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar alt={landlordName} name={landlordName} size="sm" src={landlordAvatar} />
              <div>
                <p className="text-xs font-semibold text-slate-800">{landlordName}</p>
                <p className="text-[11px] text-slate-500">Available {formatDateLabel(listing.availableFrom)}</p>
              </div>
            </div>
            {landlordProfile?.verifiedKYC ? <Badge variant="success">Verified</Badge> : <Badge>Profile</Badge>}
          </div>

          <div>
            <Link to={listingDetailPath}>
              <Button className="w-full sm:w-auto" size="sm">
                View details
              </Button>
            </Link>
          </div>
        </CardBody>
      </div>
    </Card>
  )
}

function ListingCardSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="flex flex-col sm:flex-row">
        <div className="h-52 animate-pulse bg-slate-200 sm:h-auto sm:w-60 lg:w-64" />
        <CardBody className="flex-1 space-y-3 p-4">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
        </CardBody>
      </div>
    </Card>
  )
}

function ResultsPanelCard({ listing, returnTo = '/listings' }) {
  const previewUrl = imageUrlForListing(listing)
  const detailPath = `/listings/${listing.$id}`
  const bedrooms = Number.isFinite(Number(listing.bedrooms)) ? Number(listing.bedrooms) : '--'
  const bathrooms = Number.isFinite(Number(listing.bathrooms)) ? Number(listing.bathrooms) : '--'
  const isLandListing = String(listing.propertyType || '').trim() === 'land'
  const landTenureLabel = getLandTenureLabel(listing.landTenureType) || 'Tenure not set'
  const locationLabel = [listing.district, getRegionLabel(listing.region)].filter(Boolean).join(', ')
  const listingIntentLabel = toListingIntentLabel(listing.listingIntent)

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link className="block" state={{ returnTo }} to={detailPath}>
        <div className="aspect-[16/10] bg-slate-100">
          {previewUrl ? (
            <img alt={listing.title} className="h-full w-full object-cover" src={previewUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
          )}
        </div>
        <div className="space-y-2 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{listingIntentLabel}</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
          {isLandListing ? (
            <p className="text-sm font-semibold text-slate-700">
              {toTitleCase(listing.propertyType, '--')} | {landTenureLabel}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-700">
              {bedrooms} bds | {bathrooms} ba | {toTitleCase(listing.propertyType, '--')}
            </p>
          )}
          <p className="line-clamp-1 text-base font-semibold text-slate-900">{listing.title}</p>
          <p className="line-clamp-2 text-sm text-slate-600">
            {listing.address ? `${listing.address}, ` : ''}
            {listing.city}, {listing.country}
          </p>
          {locationLabel && <p className="line-clamp-1 text-xs font-semibold text-slate-500">{locationLabel}</p>}
        </div>
      </Link>
    </article>
  )
}

function buildPagination(currentPage, totalPages) {
  const pages = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

function buildFiltersFromSearchParams(searchParams, mode) {
  const category = toListingCategory(searchParams.get('category'))
  const rawPropertyType = String(searchParams.get('propertyType') || '')
    .trim()
    .toLowerCase()
  const supportedTypes = new Set((marketModePropertyTypes[mode] || []).concat('all'))

  if (category === 'land') {
    return {
      listingCategory: 'land',
      propertyType: 'land',
      landTenureType: '',
    }
  }

  const propertyType = supportedTypes.has(rawPropertyType) && rawPropertyType !== 'land' ? rawPropertyType : 'all'

  return {
    listingCategory: 'property',
    propertyType,
    landTenureType: '',
  }
}

export function ListingsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = toMarketMode(searchParams.get('mode'))
  const initialQueryFilters = buildFiltersFromSearchParams(searchParams, initialMode)
  const [marketMode, setMarketMode] = useState(() => initialMode)
  const [draftFilters, setDraftFilters] = useState(() => ({
    ...emptyFilters,
    ...initialQueryFilters,
  }))
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...emptyFilters,
    ...initialQueryFilters,
  }))
  const showMap = true
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [documents, setDocuments] = useState([])
  const [landlordProfilesById, setLandlordProfilesById] = useState({})

  const landlordIds = useMemo(
    () => [...new Set(documents.map((listing) => listing.landlordId).filter(Boolean))],
    [documents],
  )

  useEffect(() => {
    const missingLandlordIds = landlordIds.filter((landlordId) => !landlordProfilesById[landlordId])
    if (missingLandlordIds.length === 0) {
      return
    }

    let active = true

    const run = async () => {
      try {
        const response = await dbService.listDocuments({
          collectionId: collections.users,
          queries: [Query.equal('userId', missingLandlordIds), Query.limit(Math.min(100, missingLandlordIds.length))],
        })

        if (!active) {
          return
        }

        setLandlordProfilesById((previous) => {
          const next = { ...previous }
          response.documents.forEach((profile) => {
            next[profile.userId] = profile
          })
          return next
        })
      } catch {
        // Non-blocking profile hydration failure.
      }
    }

    run()

    return () => {
      active = false
    }
  }, [landlordIds, landlordProfilesById])

  const fetchFilters = useMemo(
    () => ({
      keyword: appliedFilters.keyword,
      listingIntent: marketMode === 'buy' ? 'sale' : '',
      city: appliedFilters.city,
      region: appliedFilters.region,
      district: appliedFilters.district,
      landTenureType: appliedFilters.landTenureType,
      propertyType: appliedFilters.propertyType,
      minRent: appliedFilters.minRent,
      maxRent: appliedFilters.maxRent,
    }),
    [
      appliedFilters.city,
      appliedFilters.district,
      appliedFilters.keyword,
      appliedFilters.landTenureType,
      appliedFilters.maxRent,
      appliedFilters.minRent,
      appliedFilters.propertyType,
      appliedFilters.region,
      marketMode,
    ],
  )

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      setError('')

      try {
        const result = await listingsService.listPublicListings({
          filters: fetchFilters,
          mode: 'all',
          limit: 100,
        })

        if (!active) {
          return
        }

        setDocuments(result.documents)
      } catch (fetchError) {
        if (!active) {
          return
        }

        setDocuments([])
        setError(fetchError?.message || 'Unable to load listings.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [fetchFilters])

  const radiusKm = toNumberOrNull(appliedFilters.radiusKm)
  const canUseDistance = Boolean(userLocation)

  const filteredListings = useMemo(() => {
    const requiredListingIntent = marketMode === 'buy' ? 'sale' : 'rent'
    const normalizedKeyword = String(appliedFilters.keyword || '')
      .trim()
      .toLowerCase()

    const withDistance = documents.map((listing) => {
      const distanceKm = canUseDistance
        ? calculateDistanceKm(userLocation, {
            latitude: Number(listing.latitude),
            longitude: Number(listing.longitude),
          })
        : null

      return {
        ...listing,
        distanceKm,
      }
    })

    const radiusFiltered = withDistance.filter((listing) => {
      if (!radiusKm || radiusKm <= 0 || !canUseDistance) {
        return true
      }

      if (!Number.isFinite(listing.distanceKm)) {
        return false
      }

      return listing.distanceKm <= radiusKm
    })

    const modeSupportedTypes = new Set(marketModePropertyTypes[marketMode] || [])
    const modeFiltered = radiusFiltered.filter((listing) => {
      const listingType = String(listing.propertyType || '').trim()
      if (!modeSupportedTypes.has(listingType)) {
        return false
      }

      const listingIntent = String(listing.listingIntent || '')
        .trim()
        .toLowerCase()

      if (!listingIntent) {
        return requiredListingIntent === 'rent'
      }

      return listingIntent === requiredListingIntent
    })
    const categoryFiltered = modeFiltered.filter((listing) => {
      const type = String(listing.propertyType || '').trim()

      if (appliedFilters.listingCategory === 'land') {
        return type === 'land'
      }

      if (appliedFilters.listingCategory === 'property') {
        return type !== 'land'
      }

      return true
    })

    const keywordFiltered = categoryFiltered.filter((listing) => {
      if (!normalizedKeyword) {
        return true
      }

      const searchableValues = [
        listing.title,
        listing.description,
        listing.address,
        listing.city,
        listing.neighborhood,
        listing.district,
        listing.region,
      ]

      return searchableValues.some((value) => String(value || '').toLowerCase().includes(normalizedKeyword))
    })

    const sorted = [...keywordFiltered]
    if (canUseDistance && (appliedFilters.sortBy === 'distance' || appliedFilters.sortBy === 'latest')) {
      sorted.sort((a, b) => {
        const distanceA = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY
        const distanceB = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY
        return distanceA - distanceB
      })
    } else if (appliedFilters.sortBy === 'rent-asc') {
      sorted.sort((a, b) => Number(a.rentAmount || 0) - Number(b.rentAmount || 0))
    } else if (appliedFilters.sortBy === 'rent-desc') {
      sorted.sort((a, b) => Number(b.rentAmount || 0) - Number(a.rentAmount || 0))
    } else {
      sorted.sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
    }

    return sorted
  }, [appliedFilters.keyword, appliedFilters.listingCategory, appliedFilters.sortBy, canUseDistance, documents, marketMode, radiusKm, userLocation])

  const total = filteredListings.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const pageListings = filteredListings.slice(pageStart, pageEnd)
  const pagination = useMemo(() => buildPagination(currentPage, totalPages), [currentPage, totalPages])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const nextMode = toMarketMode(searchParams.get('mode'))
    const queryFilters = buildFiltersFromSearchParams(searchParams, nextMode)

    setMarketMode((previous) => (previous === nextMode ? previous : nextMode))
    setDraftFilters((previous) => {
      const next = {
        ...previous,
        ...queryFilters,
      }

      if (
        next.listingCategory === previous.listingCategory &&
        next.propertyType === previous.propertyType &&
        next.landTenureType === previous.landTenureType
      ) {
        return previous
      }

      return next
    })
    setAppliedFilters((previous) => {
      const next = {
        ...previous,
        ...queryFilters,
      }

      if (
        next.listingCategory === previous.listingCategory &&
        next.propertyType === previous.propertyType &&
        next.landTenureType === previous.landTenureType
      ) {
        return previous
      }

      return next
    })
    setCurrentPage(1)
  }, [searchParams])

  const onFilterChange = (key, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const applyFilterPatch = (patch) => {
    setDraftFilters((previous) => {
      const next = {
        ...previous,
        ...patch,
      }
      setAppliedFilters(next)
      return next
    })
    setCurrentPage(1)
  }

  const switchMarketMode = (nextMode) => {
    const safeMode = toMarketMode(nextMode)
    setMarketMode(safeMode)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('mode', safeMode)
    setSearchParams(nextParams)

    setDraftFilters((previous) => ({
      ...previous,
      listingCategory: 'property',
      propertyType: 'all',
      landTenureType: '',
    }))
    setAppliedFilters((previous) => ({
      ...previous,
      listingCategory: 'property',
      propertyType: 'all',
      landTenureType: '',
    }))
    setCurrentPage(1)
  }

  const applyPropertyTypeShortcut = (propertyType) => {
    const value = String(propertyType || '').trim() || 'all'
    applyFilterPatch({
      listingCategory: 'property',
      propertyType: value,
      landTenureType: '',
    })
  }

  const applyRegionShortcut = (region) => {
    const value = String(region || '')
      .trim()
      .toLowerCase()
    applyFilterPatch({
      region: value,
      district: '',
    })
  }

  const applyDistrictShortcut = (district) => {
    applyFilterPatch({
      district: String(district || '').trim(),
    })
  }

  const applyLandTenureShortcut = (tenure) => {
    const value = String(tenure || '')
      .trim()
      .toLowerCase()

    applyFilterPatch({
      listingCategory: 'land',
      landTenureType: value,
      propertyType: 'land',
    })
  }

  const applyPricePreset = (value) => {
    const normalized = String(value || '').trim()
    if (normalized === 'low') {
      applyFilterPatch({ minRent: '', maxRent: '700000' })
      return
    }

    if (normalized === 'mid') {
      applyFilterPatch({ minRent: '700000', maxRent: '1500000' })
      return
    }

    if (normalized === 'high') {
      applyFilterPatch({ minRent: '1500000', maxRent: '' })
      return
    }

    applyFilterPatch({ minRent: '', maxRent: '' })
  }

  const requestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported on this browser.')
      return
    }

    setLocating(true)
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        applyFilterPatch({
          sortBy: 'distance',
          radiusKm: appliedFilters.radiusKm || '10',
        })
      },
      (positionError) => {
        setLocating(false)

        if (positionError.code === 1) {
          setGeoError('Location permission denied. Please allow location access.')
          return
        }

        if (positionError.code === 2) {
          setGeoError('Unable to determine your location right now.')
          return
        }

        setGeoError('Location request timed out. Please try again.')
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60_000,
      },
    )
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters(draftFilters)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  const mapListings = filteredListings.slice(0, 150)

  const propertyTypeLabelByValue = useMemo(
    () =>
      propertyTypeOptions.reduce((accumulator, option) => {
        accumulator[option.value] = option.label
        return accumulator
      }, {}),
    [],
  )

  const modePropertyTypeOptions = useMemo(() => {
    const supported = marketModePropertyTypes[marketMode] || []
    const byValue = new Map(propertyTypeOptions.map((option) => [option.value, option]))
    return supported
      .filter((value) => value !== 'land')
      .map((value) => byValue.get(value))
      .filter(Boolean)
  }, [marketMode])
  const districtOptions = useMemo(() => getDistrictOptionsForRegion(draftFilters.region), [draftFilters.region])
  const showLandTenureFilter = draftFilters.listingCategory === 'land'
  const showPropertyTypeFilter = draftFilters.listingCategory === 'property'

  const selectedModeLabel = marketMode === 'buy' ? 'Buy' : 'Rent'
  const selectedPropertyTypeLabel = (() => {
    if (appliedFilters.listingCategory === 'land') {
      return 'Land'
    }

    if (appliedFilters.propertyType && appliedFilters.propertyType !== 'all') {
      return propertyTypeLabelByValue[appliedFilters.propertyType] || toTitleCase(appliedFilters.propertyType)
    }

    return 'Property'
  })()
  const returnTo = `${location.pathname}${location.search}`

  useEffect(() => {
    const allowed = new Set((marketModePropertyTypes[marketMode] || []).concat('all'))

    if (!allowed.has(draftFilters.propertyType)) {
      setDraftFilters((previous) => ({
        ...previous,
        propertyType: 'all',
      }))
    }

    if (!allowed.has(appliedFilters.propertyType)) {
      setAppliedFilters((previous) => ({
        ...previous,
        propertyType: 'all',
      }))
      setCurrentPage(1)
    }
  }, [appliedFilters.propertyType, draftFilters.propertyType, marketMode])

  useEffect(() => {
    if (draftFilters.listingCategory === 'land' && draftFilters.propertyType !== 'land') {
      setDraftFilters((previous) => ({
        ...previous,
        propertyType: 'land',
      }))
    }

    if (appliedFilters.listingCategory === 'land' && appliedFilters.propertyType !== 'land') {
      setAppliedFilters((previous) => ({
        ...previous,
        propertyType: 'land',
      }))
    }
  }, [appliedFilters.listingCategory, appliedFilters.propertyType, draftFilters.listingCategory, draftFilters.propertyType])

  useEffect(() => {
    if (showLandTenureFilter) {
      return
    }

    if (!draftFilters.landTenureType && !appliedFilters.landTenureType) {
      return
    }

    setDraftFilters((previous) => ({
      ...previous,
      landTenureType: '',
    }))
    setAppliedFilters((previous) => ({
      ...previous,
      landTenureType: '',
    }))
  }, [appliedFilters.landTenureType, draftFilters.landTenureType, showLandTenureFilter])

  return (
    <div className="space-y-4 pb-24">
      <section className="sticky top-20 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" id="listing-filters">
        <form className="flex flex-wrap items-center gap-2" onSubmit={applyFilters}>
          <input
            className="h-11 min-w-[220px] flex-1 rounded-lg border border-slate-300 px-4 text-base text-slate-900 outline-none focus:border-blue-500"
            onChange={(event) => onFilterChange('keyword', event.target.value)}
            placeholder="Search by city, address, or listing title"
            value={draftFilters.keyword}
          />

          <button
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:border-blue-500"
            onClick={() => switchMarketMode(marketMode === 'buy' ? 'rent' : 'buy')}
            type="button"
          >
            {marketMode === 'buy' ? 'For Sale' : 'For Rent'}
          </button>

          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
            defaultValue="any"
            onChange={(event) => applyPricePreset(event.target.value)}
          >
            <option value="any">Price</option>
            <option value="low">Up to 700,000</option>
            <option value="mid">700,000 - 1,500,000</option>
            <option value="high">1,500,000+</option>
          </select>

          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
            disabled={!userLocation}
            onChange={(event) => applyFilterPatch({ radiusKm: event.target.value })}
            value={draftFilters.radiusKm || ''}
          >
            <option value="">Radius</option>
            <option value="3">3 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
          </select>

          {showPropertyTypeFilter && (
            <select
              className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
              onChange={(event) => applyPropertyTypeShortcut(event.target.value)}
              value={draftFilters.propertyType}
            >
              <option value="all">Property type</option>
              {modePropertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
            onChange={(event) => applyRegionShortcut(event.target.value)}
            value={draftFilters.region}
          >
            <option value="">Region</option>
            {ugandaRegionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
            disabled={!draftFilters.region}
            onChange={(event) => applyDistrictShortcut(event.target.value)}
            value={draftFilters.district}
          >
            <option value="">{draftFilters.region ? 'District' : 'Select region first'}</option>
            {districtOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {showLandTenureFilter && (
            <select
              className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
              onChange={(event) => applyLandTenureShortcut(event.target.value)}
              value={draftFilters.landTenureType}
            >
              <option value="">Land tenure</option>
              {ugandaLandTenureOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <Button
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 hover:border-blue-500"
            loading={locating}
            loadingText="Locating..."
            onClick={requestUserLocation}
            size="sm"
            type="button"
            variant="secondary"
          >
            {userLocation ? 'Location on' : 'Use my location'}
          </Button>

          <Button
            className="h-11 rounded-lg bg-blue-700 px-5 text-base font-semibold text-white hover:bg-blue-800"
            onClick={() => toast.success('Search preferences saved for this session.')}
            size="sm"
            type="button"
          >
            Save search
          </Button>
        </form>
        {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
        {userLocation && (
          <p className="mt-2 text-xs text-slate-600">
            Prioritizing nearest listings from your location.
            {Number.isFinite(userLocation.accuracy) ? ` Accuracy: ${Math.round(userLocation.accuracy)}m` : ''}
          </p>
        )}
      </section>

      <div className={`grid gap-4 ${showMap ? 'lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white' : ''}`}>
        {showMap && (
          <aside className="hidden lg:block lg:border-r lg:border-slate-200">
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow">
                {selectedModeLabel} | {selectedPropertyTypeLabel}
              </div>
              <ListingsMapView heightClassName="h-[76vh] min-h-[560px] rounded-none border-0" listings={mapListings} userLocation={userLocation} />
            </div>
          </aside>
        )}

        <div className={`space-y-4 ${showMap ? 'lg:h-[76vh] lg:min-h-[560px] lg:overflow-y-auto lg:bg-white' : ''}`}>
          <div className={`${showMap ? 'lg:sticky lg:top-0 lg:z-10 lg:border-b lg:border-slate-200 lg:bg-white' : ''} rounded-xl border border-slate-200 bg-white px-4 py-3 lg:rounded-none lg:border-0`}>
            <h2 className="text-[2.2rem] leading-tight font-bold text-slate-900">
              {selectedModeLabel === 'buy' ? 'Real Estate & Homes For Sale' : 'Homes For Rent'}
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">{loading ? 'Loading...' : `${total} result${total === 1 ? '' : 's'}`}</p>
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                onChange={(event) => applyFilterPatch({ sortBy: event.target.value })}
                value={appliedFilters.sortBy}
              >
                <option value="latest">Sort: Latest</option>
                <option value="rent-asc">Sort: Rent low-high</option>
                <option value="rent-desc">Sort: Rent high-low</option>
                <option disabled={!userLocation} value="distance">
                  Sort: Distance
                </option>
              </select>
            </div>
          </div>

          <div className={`${showMap ? 'xl:px-3 xl:pb-3' : ''} space-y-3`}>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, index) => <ListingCardSkeleton key={`listing-skeleton-${index + 1}`} />)
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : pageListings.length === 0 ? (
              <Card>
                <CardBody className="py-10 text-center">
                  <p className="text-slate-700">No listings match your filters.</p>
                  <p className="mt-1 text-sm text-slate-500">Try adjusting keyword, region, district, tenure, radius, or price range.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button onClick={clearFilters} size="sm" type="button" variant="secondary">
                      Clear all filters
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              pageListings.map((listing) => <ResultsPanelCard key={listing.$id} listing={listing} returnTo={returnTo} />)
            )}
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                size="sm"
                type="button"
                variant="secondary"
              >
                Previous
              </Button>
              {pagination.map((page) => (
                <Button key={page} onClick={() => setCurrentPage(page)} size="sm" type="button" variant={page === currentPage ? 'primary' : 'secondary'}>
                  {page}
                </Button>
              ))}
              <Button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                size="sm"
                type="button"
                variant="secondary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {showMap && (
        <div className="lg:hidden">
          <Card className="overflow-hidden border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base">Map view</CardTitle>
              <p className="text-xs text-slate-500">{Math.min(mapListings.length, total)} results on map</p>
            </CardHeader>
            <CardBody className="p-0">
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow">
                  {selectedModeLabel} | {selectedPropertyTypeLabel}
                </div>
                <ListingsMapView listings={mapListings} userLocation={userLocation} />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  )
}
