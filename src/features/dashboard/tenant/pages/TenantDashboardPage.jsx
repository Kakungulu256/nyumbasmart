import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { collections } from '@/constants/collections'
import { applicationsService } from '@/features/applications/services/applicationsService'
import { savedListingsService } from '@/features/listings/services/savedListingsService'
import { messagingService } from '@/features/messaging/services/messagingService'
import { useAuth } from '@/hooks/useAuth'
import { dbService, Query } from '@/services/appwrite/db'
import { formatCurrency } from '@/utils/currency'

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

function fullName(profile) {
  const firstName = String(profile?.firstName || '').trim()
  const lastName = String(profile?.lastName || '').trim()
  return `${firstName} ${lastName}`.trim()
}

function eventTimestamp(item) {
  return new Date(item.timestamp || 0).getTime()
}

const metricLabelClassName = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const itemRowClassName = 'space-y-1 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition hover:border-brand-200 hover:bg-brand-50/40'
const activityRowClassName = 'flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition hover:border-brand-200 hover:bg-brand-50/40'

export function TenantDashboardPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedListingIds, setSavedListingIds] = useState([])
  const [savedListings, setSavedListings] = useState([])
  const [applications, setApplications] = useState([])
  const [conversations, setConversations] = useState([])
  const [listingsById, setListingsById] = useState({})
  const [profilesByUserId, setProfilesByUserId] = useState({})

  const loadDashboard = useCallback(async () => {
    if (!user?.$id) {
      setSavedListingIds([])
      setSavedListings([])
      setApplications([])
      setConversations([])
      setListingsById({})
      setProfilesByUserId({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const nextSavedListingIds = savedListingsService.listSavedListingIds({
        userId: user.$id,
      })

      const [tenantApplications, conversationSummaries] = await Promise.all([
        applicationsService.listTenantApplications({ tenantId: user.$id }),
        messagingService.listUserConversations({ userId: user.$id }),
      ])

      const listingIds = [
        ...new Set([...nextSavedListingIds, ...tenantApplications.map((application) => application.listingId), ...conversationSummaries.map((item) => item.listingId)].filter(Boolean)),
      ]

      const participantIds = [...new Set(conversationSummaries.map((item) => item.participantId).filter(Boolean))]
      const [listingResponse, profileResponse] = await Promise.all([
        listingIds.length > 0
          ? dbService.listDocuments({
              collectionId: collections.listings,
              queries: [Query.equal('$id', listingIds), Query.limit(Math.min(100, listingIds.length))],
            })
          : Promise.resolve({ documents: [] }),
        participantIds.length > 0
          ? dbService.listDocuments({
              collectionId: collections.users,
              queries: [Query.equal('userId', participantIds), Query.limit(Math.min(100, participantIds.length))],
            })
          : Promise.resolve({ documents: [] }),
      ])

      const nextListingsById = {}
      listingResponse.documents.forEach((listing) => {
        nextListingsById[listing.$id] = listing
      })

      const nextProfilesByUserId = {}
      profileResponse.documents.forEach((profile) => {
        nextProfilesByUserId[profile.userId] = profile
      })

      setSavedListingIds(nextSavedListingIds)
      setSavedListings(nextSavedListingIds.map((listingId) => nextListingsById[listingId]).filter(Boolean))
      setApplications(tenantApplications)
      setConversations(conversationSummaries)
      setListingsById(nextListingsById)
      setProfilesByUserId(nextProfilesByUserId)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load tenant dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [user?.$id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

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

  const unreadConversationCount = useMemo(
    () => conversations.reduce((sum, conversation) => sum + Number(conversation.unreadCount || 0), 0),
    [conversations],
  )

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.createdAt || b.$createdAt || 0).getTime() - new Date(a.createdAt || a.$createdAt || 0).getTime())
        .slice(0, 5),
    [applications],
  )

  const recentConversations = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
        .slice(0, 5),
    [conversations],
  )

  const recentActivity = useMemo(() => {
    const applicationActivity = applications.map((application) => ({
      id: `app-${application.$id}`,
      type: 'application',
      title: `Application ${statusLabel(application.status)}`,
      subtitle: listingsById[application.listingId]?.title || application.listingId,
      timestamp: application.createdAt || application.$createdAt,
    }))

    const conversationActivity = conversations
      .filter((conversation) => conversation.lastMessageAt)
      .map((conversation) => ({
        id: `msg-${conversation.conversationId}`,
        type: 'message',
        title: conversation.unreadCount > 0 ? `${conversation.unreadCount} unread message(s)` : 'Conversation updated',
        subtitle:
          fullName(profilesByUserId[conversation.participantId]) ||
          conversation.participantId ||
          listingsById[conversation.listingId]?.title ||
          'Chat',
        timestamp: conversation.lastMessageAt,
      }))

    return [...applicationActivity, ...conversationActivity].sort((a, b) => eventTimestamp(b) - eventTimestamp(a)).slice(0, 8)
  }, [applications, conversations, listingsById, profilesByUserId])

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
        <h1 className="text-2xl font-bold text-slate-900">Tenant Dashboard</h1>
        <p className="text-sm text-slate-600">Saved listings, submitted applications, and messaging activity in one place.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Saved Listings</p>
            <p className="text-2xl font-bold text-slate-900">{savedListingIds.length}</p>
            <p className="text-xs text-slate-500">Available now: {savedListings.length}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Applications</p>
            <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
            <p className="text-xs text-slate-500">Pending: {applicationCounts.pending}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Accepted</p>
            <p className="text-2xl font-bold text-slate-900">{applicationCounts.accepted}</p>
            <p className="text-xs text-slate-500">Rejected: {applicationCounts.rejected}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-1 py-4">
            <p className={metricLabelClassName}>Unread Chats</p>
            <p className="text-2xl font-bold text-slate-900">{unreadConversationCount}</p>
            <p className="text-xs text-slate-500">Conversations: {conversations.length}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Saved Listings</CardTitle>
            <Link to="/listings">
              <Button size="sm" variant="secondary">
                Browse
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {savedListings.length === 0 ? (
              <p className="text-sm text-slate-600">No saved listings yet. Use Save on any listing card.</p>
            ) : (
              savedListings.slice(0, 5).map((listing) => (
                <article className={itemRowClassName} key={listing.$id}>
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{listing.title}</p>
                  <p className="text-xs text-slate-500">
                    {listing.city}, {listing.country}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-brand-800">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
                    <Link className="text-xs font-semibold text-brand-700 hover:underline" to={`/listings/${listing.$id}`}>
                      View
                    </Link>
                  </div>
                </article>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Submitted Applications</CardTitle>
            <Link to="/dashboard/tenant/applications">
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="warning">Pending: {applicationCounts.pending}</Badge>
              <Badge variant="success">Accepted: {applicationCounts.accepted}</Badge>
              <Badge variant="danger">Rejected: {applicationCounts.rejected}</Badge>
            </div>

            {recentApplications.length === 0 ? (
              <p className="text-sm text-slate-600">You have not submitted any applications yet.</p>
            ) : (
              recentApplications.map((application) => (
                <article className={itemRowClassName} key={application.$id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {listingsById[application.listingId]?.title || application.listingId}
                    </p>
                    <Badge variant={statusVariant(application.status)}>{statusLabel(application.status)}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">Submitted: {formatDate(application.createdAt || application.$createdAt)}</p>
                </article>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Chat Widget</CardTitle>
            <Link to="/messages">
              <Button size="sm" variant="secondary">
                Open chats
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {recentConversations.length === 0 ? (
              <p className="text-sm text-slate-600">No conversations yet. Contact landlords from listing detail pages.</p>
            ) : (
              recentConversations.map((conversation) => (
                <article className={itemRowClassName} key={conversation.conversationId}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {fullName(profilesByUserId[conversation.participantId]) || conversation.participantId}
                    </p>
                    {conversation.unreadCount > 0 && <Badge variant="danger">{conversation.unreadCount} unread</Badge>}
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">{listingsById[conversation.listingId]?.title || conversation.listingId}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{conversation.lastMessageBody || 'No message text yet.'}</p>
                </article>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Widget</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-600">No recent activity yet.</p>
          ) : (
            recentActivity.map((event) => (
              <article className={activityRowClassName} key={event.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-500">{event.subtitle}</p>
                </div>
                <div className="text-right">
                  <Badge variant={event.type === 'message' ? 'info' : 'neutral'}>{event.type}</Badge>
                  <p className="mt-1 text-[11px] text-slate-500">{formatDate(event.timestamp)}</p>
                </div>
              </article>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}
