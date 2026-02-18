import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, FormField, Input, Spinner, getFieldInputClassName } from '@/components/ui'
import { ListingsMapView } from '@/features/listings/components/ListingsMapView'
import { listingsService } from '@/features/listings/services/listingsService'
import { propertyTypeOptions } from '@/features/listings/utils/listingForm'
import { calculateDistanceKm, toNumberOrNull } from '@/features/listings/utils/geo'
import { buckets } from '@/constants/buckets'
import { storageService } from '@/services/appwrite/storage'
import { formatCurrency } from '@/utils/currency'

const PAGE_SIZE = 9

const emptyFilters = {
  keyword: '',
  city: '',
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

function ListingCard({ listing }) {
  const previewUrl = imageUrlForListing(listing)
  const shortDescription = String(listing.description || '').slice(0, 140)
  const hasDistance = Number.isFinite(listing.distanceKm)

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[4/3] bg-slate-100">
        {previewUrl ? (
          <img alt={listing.title} className="h-full w-full object-cover" src={previewUrl} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
        )}
      </div>

      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{listing.title}</h3>
          <Badge variant="success">Available</Badge>
        </div>

        <p className="text-sm text-slate-600">
          {listing.city}, {listing.country}
        </p>

        {hasDistance && <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{listing.distanceKm.toFixed(1)} km away</p>}

        <p className="text-sm text-slate-500">
          {shortDescription}
          {String(listing.description || '').length > 140 ? '...' : ''}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-brand-900">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{listing.paymentFrequency}</p>
        </div>

        <Link className="block" to={`/listings/${listing.$id}`}>
          <Button className="w-full" size="sm">
            View listing
          </Button>
        </Link>
      </CardBody>
    </Card>
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

function mapPermissionTone(permissionState) {
  if (permissionState === 'granted') {
    return 'success'
  }

  if (permissionState === 'denied') {
    return 'danger'
  }

  return 'neutral'
}

export function ListingsPage() {
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [showMap, setShowMap] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [geoError, setGeoError] = useState('')
  const [geoPermission, setGeoPermission] = useState('unknown')
  const [userLocation, setUserLocation] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoPermission('unsupported')
      return undefined
    }

    if (!navigator.permissions?.query) {
      setGeoPermission('prompt')
      return undefined
    }

    let active = true
    let permissionStatus

    const syncPermission = () => {
      if (active && permissionStatus) {
        setGeoPermission(permissionStatus.state)
      }
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!active) {
          return
        }

        permissionStatus = status
        setGeoPermission(status.state)

        if (typeof status.addEventListener === 'function') {
          status.addEventListener('change', syncPermission)
        } else {
          status.onchange = syncPermission
        }
      })
      .catch(() => {
        if (active) {
          setGeoPermission('prompt')
        }
      })

    return () => {
      active = false
      if (!permissionStatus) {
        return
      }

      if (typeof permissionStatus.removeEventListener === 'function') {
        permissionStatus.removeEventListener('change', syncPermission)
      } else {
        permissionStatus.onchange = null
      }
    }
  }, [])

  const fetchFilters = useMemo(
    () => ({
      keyword: appliedFilters.keyword,
      city: appliedFilters.city,
      propertyType: appliedFilters.propertyType,
      minRent: appliedFilters.minRent,
      maxRent: appliedFilters.maxRent,
    }),
    [appliedFilters.city, appliedFilters.keyword, appliedFilters.maxRent, appliedFilters.minRent, appliedFilters.propertyType],
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

    const sorted = [...radiusFiltered]
    if (appliedFilters.sortBy === 'distance' && canUseDistance) {
      sorted.sort((a, b) => {
        const distanceA = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY
        const distanceB = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY
        return distanceA - distanceB
      })
    } else {
      sorted.sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
    }

    return sorted
  }, [appliedFilters.sortBy, canUseDistance, documents, radiusKm, userLocation])

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

  const onFilterChange = (key, value) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }))
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
        setGeoPermission('granted')
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })

        setDraftFilters((previous) => ({
          ...previous,
          radiusKm: previous.radiusKm || '10',
        }))
      },
      (positionError) => {
        setLocating(false)

        if (positionError.code === 1) {
          setGeoPermission('denied')
          setGeoError('Location permission denied. Allow location access to use distance filters.')
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

  const clearLocation = () => {
    setUserLocation(null)
    setDraftFilters((previous) => ({
      ...previous,
      radiusKm: '',
      sortBy: previous.sortBy === 'distance' ? 'latest' : previous.sortBy,
    }))
    setAppliedFilters((previous) => ({
      ...previous,
      radiusKm: '',
      sortBy: previous.sortBy === 'distance' ? 'latest' : previous.sortBy,
    }))
  }

  const mapListings = filteredListings.slice(0, 150)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discover Listings</h1>
          <p className="text-sm text-slate-600">Browse available rentals with search, geo-filters, and map pins.</p>
        </div>
        <Button onClick={() => setShowMap((value) => !value)} size="sm" type="button" variant="secondary">
          {showMap ? 'Hide map' : 'Show map'}
        </Button>
      </header>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Search, Filters & GeoSearch</CardTitle>
            <Badge variant={mapPermissionTone(geoPermission)}>
              Geo permission: {geoPermission === 'unsupported' ? 'unsupported' : geoPermission}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button loading={locating} loadingText="Locating..." onClick={requestUserLocation} size="sm" type="button">
              Use my location
            </Button>
            {userLocation && (
              <Button onClick={clearLocation} size="sm" type="button" variant="secondary">
                Clear location
              </Button>
            )}
          </div>

          {userLocation && (
            <p className="text-xs text-slate-600">
              Location active: {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
              {Number.isFinite(userLocation.accuracy) && ` (${Math.round(userLocation.accuracy)}m accuracy)`}
            </p>
          )}

          {geoError && <p className="text-xs text-red-600">{geoError}</p>}
        </CardHeader>

        <CardBody>
          <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-6" onSubmit={applyFilters}>
            <Input
              className="lg:col-span-2"
              label="Keyword"
              onChange={(event) => onFilterChange('keyword', event.target.value)}
              placeholder="Title keywords"
              value={draftFilters.keyword}
            />

            <Input
              label="City"
              onChange={(event) => onFilterChange('city', event.target.value)}
              placeholder="e.g. Kampala"
              value={draftFilters.city}
            />

            <FormField id="propertyType" label="Property type">
              <select
                className={getFieldInputClassName()}
                id="propertyType"
                onChange={(event) => onFilterChange('propertyType', event.target.value)}
                value={draftFilters.propertyType}
              >
                <option value="all">All types</option>
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <Input
              label="Min rent"
              onChange={(event) => onFilterChange('minRent', event.target.value)}
              placeholder="0"
              type="number"
              value={draftFilters.minRent}
            />

            <Input
              label="Max rent"
              onChange={(event) => onFilterChange('maxRent', event.target.value)}
              placeholder="2000000"
              type="number"
              value={draftFilters.maxRent}
            />

            <Input
              disabled={!userLocation}
              hint={!userLocation ? 'Enable location first.' : 'Show listings within this distance.'}
              label="Radius (km)"
              onChange={(event) => onFilterChange('radiusKm', event.target.value)}
              placeholder="10"
              type="number"
              value={draftFilters.radiusKm}
            />

            <FormField id="sortBy" label="Sort by">
              <select
                className={getFieldInputClassName()}
                id="sortBy"
                onChange={(event) => onFilterChange('sortBy', event.target.value)}
                value={draftFilters.sortBy}
              >
                <option value="latest">Latest</option>
                <option disabled={!userLocation} value="distance">
                  Distance
                </option>
              </select>
            </FormField>

            <div className="flex items-end gap-2 lg:col-span-6">
              <Button size="sm" type="submit">
                Apply filters
              </Button>
              <Button onClick={clearFilters} size="sm" type="button" variant="secondary">
                Clear
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {showMap && !loading && !error && mapListings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map pin view</CardTitle>
            {filteredListings.length > mapListings.length && (
              <p className="text-xs text-slate-500">Showing first {mapListings.length} pins for performance.</p>
            )}
          </CardHeader>
          <CardBody>
            <ListingsMapView listings={mapListings} userLocation={userLocation} />
          </CardBody>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {loading ? 'Loading listings...' : `Showing ${pageListings.length} of ${total} listing${total === 1 ? '' : 's'}`}
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : pageListings.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-slate-700">No listings match your filters.</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting keyword, city, radius, or rent range.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageListings.map((listing) => (
            <ListingCard key={listing.$id} listing={listing} />
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} size="sm" type="button" variant="secondary">
            Previous
          </Button>

          {pagination.map((page) => (
            <Button
              key={page}
              onClick={() => setCurrentPage(page)}
              size="sm"
              type="button"
              variant={page === currentPage ? 'primary' : 'secondary'}
            >
              {page}
            </Button>
          ))}

          <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} size="sm" type="button" variant="secondary">
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
