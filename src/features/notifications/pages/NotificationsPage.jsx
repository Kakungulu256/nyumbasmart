import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { collections } from '@/constants/collections'
import { databaseId } from '@/constants/database'
import { useAuth } from '@/hooks/useAuth'
import { notificationsService } from '@/features/notifications/services/notificationsService'
import { realtimeService } from '@/services/appwrite/realtime'
import { useAppStore } from '@/store/appStore'

function formatTimestamp(value) {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return parsed.toLocaleString()
}

function typeLabel(type) {
  return String(type || 'notification').replaceAll('_', ' ')
}

function typeVariant(type) {
  if (type === 'message_new') {
    return 'info'
  }

  if (type === 'application_accepted') {
    return 'success'
  }

  if (type === 'application_rejected') {
    return 'danger'
  }

  return 'warning'
}

function resolveRouteForNotification(notification, role) {
  if (notification.type === 'message_new') {
    return '/messages'
  }

  if (String(notification.type || '').startsWith('application_')) {
    if (role === 'landlord') {
      return '/dashboard/landlord/applications'
    }

    return '/dashboard/tenant/applications'
  }

  if (role === 'landlord') {
    return '/dashboard/landlord'
  }

  return '/dashboard/tenant'
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const setNotificationCount = useAppStore((state) => state.setNotificationCount)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [markingId, setMarkingId] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user?.$id) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const docs = await notificationsService.listUserNotifications({
        userId: user.$id,
        status: filter,
        limit: 100,
      })

      setNotifications(docs)
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [filter, user?.$id])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!user?.$id) {
      setNotificationCount(0)
      return
    }

    const unreadCount = notifications.filter((item) => item.status === 'unread').length
    if (filter === 'unread') {
      setNotificationCount(unreadCount)
      return
    }

    notificationsService
      .countUnreadNotifications({ userId: user.$id })
      .then((count) => setNotificationCount(count))
      .catch(() => setNotificationCount(unreadCount))
  }, [filter, notifications, setNotificationCount, user?.$id])

  useEffect(() => {
    if (!user?.$id) {
      return undefined
    }

    const channel = `databases.${databaseId}.collections.${collections.notifications}.documents`
    const unsubscribe = realtimeService.subscribe([channel], (event) => {
      if (!event?.payload?.$id) {
        return
      }

      if (event.payload.userId !== user.$id) {
        return
      }

      loadNotifications()
    })

    return () => {
      unsubscribe()
    }
  }, [loadNotifications, user?.$id])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.status === 'unread').length,
    [notifications],
  )

  const markOneAsRead = async (notification) => {
    if (!notification?.$id || notification.status !== 'unread') {
      return
    }

    setMarkingId(notification.$id)

    try {
      await notificationsService.markNotificationAsRead({
        notificationId: notification.$id,
      })

      setNotifications((previous) =>
        previous.map((item) =>
          item.$id === notification.$id
            ? {
                ...item,
                status: 'read',
              }
            : item,
        ),
      )
    } catch (markError) {
      toast.error(markError?.message || 'Unable to update notification.')
    } finally {
      setMarkingId('')
    }
  }

  const markAllAsRead = async () => {
    if (!user?.$id) {
      return
    }

    setMarkingAll(true)

    try {
      const updatedCount = await notificationsService.markAllAsRead({
        userId: user.$id,
      })

      if (updatedCount > 0) {
        toast.success(`${updatedCount} notification(s) marked as read.`)
      }

      await loadNotifications()
    } catch (markError) {
      toast.error(markError?.message || 'Unable to mark all notifications as read.')
    } finally {
      setMarkingAll(false)
    }
  }

  const openNotification = async (notification) => {
    if (notification.status === 'unread') {
      await markOneAsRead(notification)
    }

    navigate(resolveRouteForNotification(notification, role))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-900/5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600">Track application, message, and status updates in-app.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setFilter('all')} size="sm" type="button" variant={filter === 'all' ? 'primary' : 'secondary'}>
            All
          </Button>
          <Button onClick={() => setFilter('unread')} size="sm" type="button" variant={filter === 'unread' ? 'primary' : 'secondary'}>
            Unread
          </Button>
          <Button loading={markingAll} loadingText="Marking..." onClick={markAllAsRead} size="sm" type="button" variant="secondary">
            Mark all read
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Visible Notifications</p>
            <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
            <p className="text-2xl font-bold text-slate-900">{unreadCount}</p>
          </CardBody>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white/80">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-slate-600">No notifications yet.</CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card className="transition hover:border-brand-200/70" key={notification.$id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>{notification.title}</CardTitle>
                  <p className="text-xs text-slate-500">{formatTimestamp(notification.sentAt || notification.createdAt || notification.$createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={typeVariant(notification.type)}>{typeLabel(notification.type)}</Badge>
                  <Badge variant={notification.status === 'unread' ? 'warning' : 'neutral'}>{notification.status}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-700">{notification.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openNotification(notification)} size="sm" type="button">
                    Open
                  </Button>
                  {notification.status === 'unread' && (
                    <Button
                      loading={markingId === notification.$id}
                      loadingText="Updating..."
                      onClick={() => markOneAsRead(notification)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
