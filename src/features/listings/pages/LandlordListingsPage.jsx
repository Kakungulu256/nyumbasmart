import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { listingsService } from '@/features/listings/services/listingsService'

function StatusBadge({ status }) {
  const statusLabel = status || 'draft'

  if (statusLabel === 'available') {
    return <Badge variant="success">Published</Badge>
  }

  if (statusLabel === 'occupied') {
    return <Badge variant="warning">Occupied</Badge>
  }

  if (statusLabel === 'suspended') {
    return <Badge variant="danger">Suspended</Badge>
  }

  return <Badge variant="neutral">Draft</Badge>
}

function toListingIntentLabel(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'sale' ? 'For Sale' : 'For Rent'
}

export function LandlordListingsPage() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingListingId, setUpdatingListingId] = useState('')

  const loadListings = useCallback(async () => {
    if (!user?.$id) {
      setListings([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const documents = await listingsService.listLandlordListings({ landlordId: user.$id })
      setListings(documents)
    } catch (error) {
      toast.error(error?.message || 'Unable to load your listings.')
    } finally {
      setLoading(false)
    }
  }, [user?.$id])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const togglePublication = async (listing) => {
    const publish = listing.status !== 'available'
    setUpdatingListingId(listing.$id)

    try {
      await listingsService.setListingPublication({
        listingId: listing.$id,
        landlordId: user.$id,
        publish,
      })

      toast.success(publish ? 'Listing published.' : 'Listing moved back to draft.')
      await loadListings()
    } catch (error) {
      toast.error(error?.message || 'Unable to update listing publication status.')
    } finally {
      setUpdatingListingId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Listings</h1>
          <p className="text-sm text-slate-600">Create, edit, publish, or unpublish your properties.</p>
        </div>
        <Link to="/dashboard/landlord/listings/new">
          <Button>Create listing</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Spinner size="md" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-slate-700">No listings yet.</p>
            <p className="mt-1 text-sm text-slate-500">Create your first listing to start receiving applications.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <Card key={listing.$id}>
              <CardHeader className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{listing.title}</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    {listing.city}, {listing.country} | {listing.currency} {Number(listing.rentAmount || 0).toLocaleString()}
                    {String(listing.propertyType || '').trim() === 'land' && listing.district ? ` | ${listing.district}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{toListingIntentLabel(listing.listingIntent)}</Badge>
                  <StatusBadge status={listing.status} />
                </div>
              </CardHeader>

              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Updated {new Date(listing.updatedAt || listing.$updatedAt).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/dashboard/landlord/listings/${listing.$id}/edit`}>
                    <Button size="sm" variant="secondary">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    loading={updatingListingId === listing.$id}
                    loadingText={listing.status === 'available' ? 'Unpublishing...' : 'Publishing...'}
                    onClick={() => togglePublication(listing)}
                    size="sm"
                    variant={listing.status === 'available' ? 'ghost' : 'primary'}
                  >
                    {listing.status === 'available' ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
