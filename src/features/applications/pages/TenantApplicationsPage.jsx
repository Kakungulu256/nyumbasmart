import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { collections } from '@/constants/collections'
import { applicationsService } from '@/features/applications/services/applicationsService'
import { useAuth } from '@/hooks/useAuth'
import { dbService, Query } from '@/services/appwrite/db'

function statusVariant(status) {
  if (status === 'accepted') {
    return 'success'
  }

  if (status === 'rejected') {
    return 'danger'
  }

  if (status === 'withdrawn') {
    return 'neutral'
  }

  return 'warning'
}

function statusLabel(status) {
  return String(status || 'pending').replace('_', ' ').toUpperCase()
}

function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return parsed.toLocaleString()
}

const metricLabelClassName = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const metaRowClassName = 'text-sm text-slate-600'

export function TenantApplicationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applications, setApplications] = useState([])
  const [listingsById, setListingsById] = useState({})
  const [withdrawingId, setWithdrawingId] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.$id) {
      setApplications([])
      setListingsById({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const tenantApplications = await applicationsService.listTenantApplications({
        tenantId: user.$id,
      })

      setApplications(tenantApplications)

      const listingIds = [...new Set(tenantApplications.map((item) => item.listingId).filter(Boolean))]
      if (listingIds.length === 0) {
        setListingsById({})
        return
      }

      const listingResponse = await dbService.listDocuments({
        collectionId: collections.listings,
        queries: [Query.equal('$id', listingIds), Query.limit(Math.min(100, listingIds.length))],
      })

      const nextListingsById = {}
      listingResponse.documents.forEach((listing) => {
        nextListingsById[listing.$id] = listing
      })
      setListingsById(nextListingsById)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load your applications.')
    } finally {
      setLoading(false)
    }
  }, [user?.$id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const counts = useMemo(() => {
    const initial = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    }

    applications.forEach((application) => {
      const key = application.status
      if (key in initial) {
        initial[key] += 1
      }
    })

    return initial
  }, [applications])

  const withdraw = async (application) => {
    setWithdrawingId(application.$id)

    try {
      await applicationsService.withdrawApplication({ application })
      toast.success('Application withdrawn.')
      await loadData()
    } catch (withdrawError) {
      toast.error(withdrawError?.message || 'Unable to withdraw application.')
    } finally {
      setWithdrawingId('')
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="text-sm text-slate-600">Track application status, withdraw pending ones, and monitor decisions.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Pending</p>
            <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Accepted</p>
            <p className="text-2xl font-bold text-brand-700">{counts.accepted}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Rejected</p>
            <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Withdrawn</p>
            <p className="text-2xl font-bold text-slate-700">{counts.withdrawn}</p>
          </CardBody>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white/80">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : applications.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-8 text-center">
            <p className="text-slate-700">You have not submitted any applications yet.</p>
            <Link to="/listings">
              <Button size="sm">Browse listings</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => {
            const listing = listingsById[application.listingId]

            return (
              <Card className="transition hover:border-brand-200/70" key={application.$id}>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{listing?.title || 'Listing unavailable'}</CardTitle>
                    <p className="mt-1 text-sm text-slate-600">
                      {listing ? `${listing.city}, ${listing.country}` : 'This listing may have been removed.'}
                    </p>
                  </div>
                  <Badge variant={statusVariant(application.status)}>{statusLabel(application.status)}</Badge>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className={metaRowClassName}>Submitted: {formatDate(application.createdAt || application.$createdAt)}</p>
                    <p className={metaRowClassName}>Preferred move-in: {formatDate(application.moveInDate)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {listing && (
                      <Link to={`/listings/${listing.$id}`}>
                        <Button size="sm" type="button" variant="secondary">
                          View listing
                        </Button>
                      </Link>
                    )}

                    {application.status === 'pending' && (
                      <Button
                        loading={withdrawingId === application.$id}
                        loadingText="Withdrawing..."
                        onClick={() => withdraw(application)}
                        size="sm"
                        type="button"
                        variant="danger"
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
