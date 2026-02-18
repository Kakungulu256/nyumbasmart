import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Avatar, Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { applicationsService } from '@/features/applications/services/applicationsService'
import { buckets } from '@/constants/buckets'
import { collections } from '@/constants/collections'
import { useAuth } from '@/hooks/useAuth'
import { listingsService } from '@/features/listings/services/listingsService'
import { dbService, Query } from '@/services/appwrite/db'
import { storageService } from '@/services/appwrite/storage'
import { formatCurrency } from '@/utils/currency'

function formatValue(value, fallback = 'Not specified') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

function toDateLabel(value) {
  if (!value) {
    return 'Immediate'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Immediate'
  }

  return parsedDate.toLocaleDateString()
}

function fileViewUrl(bucketId, fileId) {
  if (!fileId) {
    return ''
  }

  const url = storageService.getFileView({
    bucketId,
    fileId,
  })

  return typeof url === 'string' ? url : url.toString()
}

function PropertyRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  )
}

export function ListingDetailPage() {
  const navigate = useNavigate()
  const { listingId } = useParams()
  const { isAuthenticated, role, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listing, setListing] = useState(null)
  const [landlordProfile, setLandlordProfile] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [submittingApplication, setSubmittingApplication] = useState(false)

  useEffect(() => {
    if (!listingId) {
      setError('Listing ID is missing.')
      setLoading(false)
      return
    }

    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const listingDocument = await listingsService.getListingById({ listingId })
        if (!active) {
          return
        }

        setListing(listingDocument)

        const landlordResult = await dbService.listDocuments({
          collectionId: collections.users,
          queries: [Query.equal('userId', listingDocument.landlordId), Query.limit(1)],
        })

        if (!active) {
          return
        }

        setLandlordProfile(landlordResult.documents[0] || null)
      } catch (fetchError) {
        if (!active) {
          return
        }

        setError(fetchError?.message || 'Unable to load listing details.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [listingId])

  const imageUrls = useMemo(
    () =>
      (listing?.imageFileIds || [])
        .map((fileId) => fileViewUrl(buckets.listingImages, fileId))
        .filter(Boolean),
    [listing?.imageFileIds],
  )

  const activeImageUrl = imageUrls[activeImageIndex] || ''
  const isOwner = Boolean(user?.$id && listing?.landlordId && user.$id === listing.landlordId)
  const landlordName = `${landlordProfile?.firstName || ''} ${landlordProfile?.lastName || ''}`.trim() || 'Landlord'
  const landlordAvatar = fileViewUrl(buckets.avatars, landlordProfile?.avatarFileId)
  const landlordLocation = [landlordProfile?.city, landlordProfile?.country].filter(Boolean).join(', ')

  const handleApplyClick = async () => {
    if (!listing) {
      return
    }

    if (!isAuthenticated) {
      navigate('/auth/login', {
        state: { from: `/listings/${listing.$id}` },
      })
      return
    }

    if (isOwner || role === 'landlord') {
      toast.error('Landlord accounts cannot apply to this listing.')
      return
    }

    if (listing.status !== 'available') {
      toast.error('This listing is not open for applications right now.')
      return
    }

    setSubmittingApplication(true)

    try {
      await applicationsService.submitApplication({
        tenantId: user.$id,
        landlordId: listing.landlordId,
        listingId: listing.$id,
      })

      toast.success('Application submitted successfully.')
      navigate('/dashboard/tenant/applications')
    } catch (submitError) {
      toast.error(submitError?.message || 'Unable to submit application.')
    } finally {
      setSubmittingApplication(false)
    }
  }

  const handleContactClick = () => {
    if (!listing) {
      return
    }

    if (!isAuthenticated) {
      navigate('/auth/login', {
        state: { from: `/listings/${listing.$id}` },
      })
      return
    }

    if (isOwner) {
      toast.error('This is your listing.')
      return
    }

    navigate(`/messages?listingId=${listing.$id}&participant=${listing.landlordId}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Spinner size="md" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <Card>
        <CardBody className="space-y-4 py-8 text-center">
          <p className="text-lg font-semibold text-slate-900">Listing unavailable</p>
          <p className="text-sm text-slate-600">{error || 'The listing could not be found.'}</p>
          <div>
            <Link to="/listings">
              <Button size="sm" variant="secondary">
                Back to listings
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={listing.status === 'available' ? 'success' : 'neutral'}>{String(listing.status || 'unknown').toUpperCase()}</Badge>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {listing.propertyType} | {listing.paymentFrequency}
          </p>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
        <p className="text-sm text-slate-600">
          {listing.address}, {listing.city}, {listing.country}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="aspect-[16/10] bg-slate-100">
              {activeImageUrl ? (
                <img alt={listing.title} className="h-full w-full object-cover" src={activeImageUrl} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No images uploaded</div>
              )}
            </div>

            {imageUrls.length > 1 && (
              <CardBody>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {imageUrls.map((imageUrl, index) => (
                    <button
                      className={`aspect-square overflow-hidden rounded-lg border ${index === activeImageIndex ? 'border-brand-700' : 'border-slate-200'}`}
                      key={imageUrl}
                      onClick={() => setActiveImageIndex(index)}
                      type="button"
                    >
                      <img alt={`Listing thumbnail ${index + 1}`} className="h-full w-full object-cover" src={imageUrl} />
                    </button>
                  ))}
                </div>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property description</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="whitespace-pre-line text-sm text-slate-700">{listing.description}</p>

              <div className="flex flex-wrap gap-2">
                {(listing.amenities || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No amenities listed.</p>
                ) : (
                  listing.amenities.map((amenity) => (
                    <Badge key={amenity} variant="info">
                      {amenity}
                    </Badge>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property attributes</CardTitle>
            </CardHeader>
            <CardBody>
              <PropertyRow label="Rent" value={formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')} />
              <PropertyRow label="Bedrooms" value={formatValue(listing.bedrooms)} />
              <PropertyRow label="Bathrooms" value={formatValue(listing.bathrooms)} />
              <PropertyRow label="Property type" value={formatValue(listing.propertyType)} />
              <PropertyRow label="Payment frequency" value={formatValue(listing.paymentFrequency)} />
              <PropertyRow label="Available from" value={toDateLabel(listing.availableFrom)} />
              <PropertyRow label="Neighborhood" value={formatValue(listing.neighborhood)} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Action</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-2xl font-bold text-brand-900">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{listing.paymentFrequency}</p>

              <Button className="w-full" loading={submittingApplication} loadingText="Submitting..." onClick={handleApplyClick} type="button">
                {isAuthenticated ? 'Apply to this property' : 'Login to apply'}
              </Button>

              <Button className="w-full" onClick={handleContactClick} type="button" variant="secondary">
                {isAuthenticated ? 'Contact landlord' : 'Login to contact'}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Landlord</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar alt={landlordName} name={landlordName} size="lg" src={landlordAvatar} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{landlordName}</p>
                  <p className="text-xs text-slate-500">{landlordProfile?.role || 'landlord'}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600">{landlordProfile?.bio || 'No landlord bio provided yet.'}</p>
              <p className="text-xs text-slate-500">{landlordLocation || 'Location not specified'}</p>
              <p className="text-xs text-slate-500">Properties managed: {formatValue(landlordProfile?.propertiesManaged, 0)}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

