import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Modal, Spinner } from '@/components/ui'
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

function formatMoveInDate(value) {
  if (!value) {
    return 'Not provided'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Not provided'
  }

  return parsed.toLocaleDateString()
}

export function LandlordApplicationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applications, setApplications] = useState([])
  const [listingsById, setListingsById] = useState({})
  const [tenantsById, setTenantsById] = useState({})
  const [processingId, setProcessingId] = useState('')
  const [selectedApplicationId, setSelectedApplicationId] = useState('')

  const selectedApplication = applications.find((item) => item.$id === selectedApplicationId) || null
  const selectedListing = selectedApplication ? listingsById[selectedApplication.listingId] : null
  const selectedTenant = selectedApplication ? tenantsById[selectedApplication.tenantId] : null

  const loadData = useCallback(async () => {
    if (!user?.$id) {
      setApplications([])
      setListingsById({})
      setTenantsById({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const incomingApplications = await applicationsService.listLandlordApplications({
        landlordId: user.$id,
      })

      setApplications(incomingApplications)

      const listingIds = [...new Set(incomingApplications.map((item) => item.listingId).filter(Boolean))]
      const tenantIds = [...new Set(incomingApplications.map((item) => item.tenantId).filter(Boolean))]

      if (listingIds.length > 0) {
        const listingResponse = await dbService.listDocuments({
          collectionId: collections.listings,
          queries: [Query.equal('$id', listingIds), Query.limit(Math.min(100, listingIds.length))],
        })

        const nextListingsById = {}
        listingResponse.documents.forEach((listing) => {
          nextListingsById[listing.$id] = listing
        })
        setListingsById(nextListingsById)
      } else {
        setListingsById({})
      }

      if (tenantIds.length > 0) {
        const tenantResponse = await dbService.listDocuments({
          collectionId: collections.users,
          queries: [Query.equal('userId', tenantIds), Query.limit(Math.min(100, tenantIds.length))],
        })

        const nextTenantsById = {}
        tenantResponse.documents.forEach((tenant) => {
          nextTenantsById[tenant.userId] = tenant
        })
        setTenantsById(nextTenantsById)
      } else {
        setTenantsById({})
      }
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load incoming applications.')
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

  const processDecision = async (application, decision) => {
    if (!application || application.status !== 'pending') {
      return
    }

    setProcessingId(application.$id)

    try {
      if (decision === 'accept') {
        await applicationsService.acceptApplication({ application })
        toast.success('Application accepted.')
      } else {
        await applicationsService.rejectApplication({ application })
        toast.success('Application rejected.')
      }

      if (selectedApplicationId === application.$id) {
        setSelectedApplicationId('')
      }

      await loadData()
    } catch (decisionError) {
      toast.error(decisionError?.message || 'Unable to process application.')
    } finally {
      setProcessingId('')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Incoming Applications</h1>
        <p className="text-sm text-slate-600">Review tenant details and accept or reject pending requests.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Accepted</p>
            <p className="text-2xl font-bold text-brand-700">{counts.accepted}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Withdrawn</p>
            <p className="text-2xl font-bold text-slate-700">{counts.withdrawn}</p>
          </CardBody>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : applications.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-8 text-center">
            <p className="text-slate-700">No incoming applications yet.</p>
            <Link to="/dashboard/landlord/listings">
              <Button size="sm">Manage listings</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => {
            const listing = listingsById[application.listingId]
            const tenant = tenantsById[application.tenantId]
            const tenantName = `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim() || 'Tenant'

            return (
              <Card key={application.$id}>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{listing?.title || 'Listing unavailable'}</CardTitle>
                    <p className="mt-1 text-sm text-slate-600">
                      Applicant: {tenantName} {tenant?.phone ? `(${tenant.phone})` : ''}
                    </p>
                  </div>
                  <Badge variant={statusVariant(application.status)}>{statusLabel(application.status)}</Badge>
                </CardHeader>

                <CardBody className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-slate-600">Submitted: {formatDate(application.createdAt || application.$createdAt)}</p>
                    <p className="text-sm text-slate-600">Preferred move-in: {formatMoveInDate(application.moveInDate)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setSelectedApplicationId(application.$id)} size="sm" type="button" variant="secondary">
                      Review details
                    </Button>

                    {application.status === 'pending' && (
                      <>
                        <Button
                          loading={processingId === application.$id}
                          loadingText="Accepting..."
                          onClick={() => processDecision(application, 'accept')}
                          size="sm"
                          type="button"
                        >
                          Accept
                        </Button>
                        <Button
                          loading={processingId === application.$id}
                          loadingText="Rejecting..."
                          onClick={() => processDecision(application, 'reject')}
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        description={selectedListing ? `${selectedListing.city}, ${selectedListing.country}` : undefined}
        isOpen={Boolean(selectedApplication)}
        onClose={() => setSelectedApplicationId('')}
        title={selectedListing?.title || 'Application details'}
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Applicant:</span>{' '}
                {selectedTenant ? `${selectedTenant.firstName} ${selectedTenant.lastName}`.trim() : selectedApplication.tenantId}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Phone:</span> {selectedTenant?.phone || 'N/A'}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Status:</span> {statusLabel(selectedApplication.status)}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Submitted:</span> {formatDate(selectedApplication.createdAt || selectedApplication.$createdAt)}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Preferred move-in:</span> {formatMoveInDate(selectedApplication.moveInDate)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-slate-900">Cover note</p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {selectedApplication.coverNote || 'No cover note provided.'}
              </p>
            </div>

            {selectedApplication.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  loading={processingId === selectedApplication.$id}
                  loadingText="Accepting..."
                  onClick={() => processDecision(selectedApplication, 'accept')}
                  size="sm"
                  type="button"
                >
                  Accept
                </Button>
                <Button
                  loading={processingId === selectedApplication.$id}
                  loadingText="Rejecting..."
                  onClick={() => processDecision(selectedApplication, 'reject')}
                  size="sm"
                  type="button"
                  variant="danger"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
