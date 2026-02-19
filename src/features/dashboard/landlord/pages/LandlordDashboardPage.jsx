import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { applicationsService } from '@/features/applications/services/applicationsService'
import { listingsService } from '@/features/listings/services/listingsService'
import { collections } from '@/constants/collections'
import { useAuth } from '@/hooks/useAuth'
import { dbService, Query } from '@/services/appwrite/db'
import { formatCurrency } from '@/utils/currency'

function statusVariant(status) {
  if (status === 'available') {
    return 'success'
  }

  if (status === 'occupied') {
    return 'warning'
  }

  if (status === 'suspended') {
    return 'danger'
  }

  return 'neutral'
}

function statusLabel(status) {
  return String(status || 'draft').replace('_', ' ').toUpperCase()
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const metricLabelClassName = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const detailRowClassName = 'flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2.5'
const listingRowClassName = 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-3 transition hover:border-brand-200 hover:bg-brand-50/40'

export function LandlordDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listings, setListings] = useState([])
  const [applications, setApplications] = useState([])
  const [activeLeases, setActiveLeases] = useState([])

  const loadDashboard = useCallback(async () => {
    if (!user?.$id) {
      setListings([])
      setApplications([])
      setActiveLeases([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [landlordListings, incomingApplications] = await Promise.all([
        listingsService.listLandlordListings({ landlordId: user.$id }),
        applicationsService.listLandlordApplications({ landlordId: user.$id }),
      ])

      setListings(landlordListings)
      setApplications(incomingApplications)

      try {
        const activeLeaseResponse = await dbService.listDocuments({
          collectionId: collections.leases,
          queries: [Query.equal('landlordId', user.$id), Query.equal('status', 'active'), Query.limit(200)],
        })

        setActiveLeases(activeLeaseResponse.documents)
      } catch {
        setActiveLeases([])
      }
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load landlord dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [user?.$id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const listingStatusCounts = useMemo(() => {
    const counts = {
      draft: 0,
      available: 0,
      occupied: 0,
      suspended: 0,
    }

    listings.forEach((listing) => {
      const status = listing.status || 'draft'
      if (status in counts) {
        counts[status] += 1
      }
    })

    return counts
  }, [listings])

  const applicationCounts = useMemo(() => {
    const counts = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    }

    applications.forEach((application) => {
      const status = application.status
      if (status in counts) {
        counts[status] += 1
      }
    })

    return counts
  }, [applications])

  const listingApplicationsById = useMemo(() => {
    const map = {}
    applications.forEach((application) => {
      if (!application.listingId) {
        return
      }
      map[application.listingId] = (map[application.listingId] || 0) + 1
    })
    return map
  }, [applications])

  const totalViewCount = useMemo(() => listings.reduce((sum, listing) => sum + safeNumber(listing.viewCount), 0), [listings])
  const topViewedListing = useMemo(() => {
    if (listings.length === 0) {
      return null
    }

    return [...listings].sort((a, b) => safeNumber(b.viewCount) - safeNumber(a.viewCount))[0]
  }, [listings])

  const uniqueActiveTenantCount = useMemo(() => {
    const tenantIds = new Set()

    activeLeases.forEach((lease) => {
      if (lease.tenantId) {
        tenantIds.add(lease.tenantId)
      }
    })

    if (tenantIds.size === 0) {
      applications.forEach((application) => {
        if (application.status === 'accepted' && application.tenantId) {
          tenantIds.add(application.tenantId)
        }
      })
    }

    return tenantIds.size
  }, [activeLeases, applications])

  const averageViewCount = listings.length > 0 ? Math.round(totalViewCount / listings.length) : 0
  const occupancyRate = listings.length > 0 ? Math.round((listingStatusCounts.occupied / listings.length) * 100) : 0

  const sortedListings = useMemo(
    () =>
      [...listings].sort((a, b) => {
        const updatedA = new Date(a.updatedAt || a.$updatedAt || 0).getTime()
        const updatedB = new Date(b.updatedAt || b.$updatedAt || 0).getTime()
        return updatedB - updatedA
      }),
    [listings],
  )

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white/80">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-bold text-slate-900">Landlord Dashboard</h1>
        <p className="text-sm text-slate-600">My properties, listing status, view engagement, and active tenant activity.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>My Properties</p>
            <p className="text-2xl font-bold text-slate-900">{listings.length}</p>
            <p className="text-xs text-slate-500">Available: {listingStatusCounts.available}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>View Counts</p>
            <p className="text-2xl font-bold text-slate-900">{totalViewCount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Avg per listing: {averageViewCount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">
              Top: {topViewedListing ? `${topViewedListing.title} (${safeNumber(topViewedListing.viewCount).toLocaleString()})` : 'N/A'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Active Tenants</p>
            <p className="text-2xl font-bold text-slate-900">{uniqueActiveTenantCount}</p>
            <p className="text-xs text-slate-500">Active leases: {activeLeases.length}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Occupancy</p>
            <p className="text-2xl font-bold text-slate-900">{occupancyRate}%</p>
            <p className="text-xs text-slate-500">Occupied: {listingStatusCounts.occupied}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Listing Status</CardTitle>
            <Link to="/dashboard/landlord/listings">
              <Button size="sm" variant="secondary">
                Manage listings
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {['draft', 'available', 'occupied', 'suspended'].map((status) => (
              <div className={detailRowClassName} key={status}>
                <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                <p className="text-sm font-semibold text-slate-900">{listingStatusCounts[status]}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Application Pipeline</CardTitle>
            <Link to="/dashboard/landlord/applications">
              <Button size="sm" variant="secondary">
                Review applications
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {['pending', 'accepted', 'rejected', 'withdrawn'].map((status) => (
              <div className={detailRowClassName} key={status}>
                <Badge variant={status === 'pending' ? 'warning' : status === 'accepted' ? 'success' : status === 'rejected' ? 'danger' : 'neutral'}>
                  {statusLabel(status)}
                </Badge>
                <p className="text-sm font-semibold text-slate-900">{applicationCounts[status]}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Tenant Summary</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className={detailRowClassName}>
              <p className="text-sm text-slate-600">Unique active tenants</p>
              <p className="text-sm font-semibold text-slate-900">{uniqueActiveTenantCount}</p>
            </div>
            <div className={detailRowClassName}>
              <p className="text-sm text-slate-600">Active leases</p>
              <p className="text-sm font-semibold text-slate-900">{activeLeases.length}</p>
            </div>
            <div className={detailRowClassName}>
              <p className="text-sm text-slate-600">Accepted applications</p>
              <p className="text-sm font-semibold text-slate-900">{applicationCounts.accepted}</p>
            </div>
            <div className={detailRowClassName}>
              <p className="text-sm text-slate-600">Pending applications</p>
              <p className="text-sm font-semibold text-slate-900">{applicationCounts.pending}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Properties Snapshot</CardTitle>
        </CardHeader>
        <CardBody>
          {sortedListings.length === 0 ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-600">No properties yet. Create your first listing to start receiving tenant interest.</p>
              <Link to="/dashboard/landlord/listings/new">
                <Button size="sm">Create listing</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedListings.slice(0, 8).map((listing) => (
                <article className={listingRowClassName} key={listing.$id}>
                  <div>
                    <p className="font-semibold text-slate-900">{listing.title}</p>
                    <p className="text-xs text-slate-500">
                      {listing.city}, {listing.country} - {formatCurrency(safeNumber(listing.rentAmount), listing.currency || 'UGX')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(listing.status)}>{statusLabel(listing.status)}</Badge>
                    <p className="text-xs text-slate-500">Views: {safeNumber(listing.viewCount).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Apps: {listingApplicationsById[listing.$id] || 0}</p>
                    <Link to={`/dashboard/landlord/listings/${listing.$id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

