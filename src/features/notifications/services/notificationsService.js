import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { backendFunctionsService } from '@/services/appwrite/backendFunctions'
import { dbService, Query } from '@/services/appwrite/db'
import { ensureSafeId, sanitizeStringArray, sanitizeTextInput } from '@/utils/security'

const MAX_NOTIFICATION_BATCH = 100
const VALID_NOTIFICATION_STATUSES = ['unread', 'read', 'archived']
const VALID_NOTIFICATION_TYPES = [
  'application_new',
  'application_accepted',
  'application_rejected',
  'lease_signature_needed',
  'lease_signed',
  'payment_request',
  'payment_confirmed',
  'payment_overdue',
  'lease_expiry',
  'maintenance_new',
  'maintenance_updated',
  'message_new',
]

export function buildNotificationPermissions(userId) {
  const safeUserId = ensureSafeId(userId, 'Notification user ID')

  return [
    Permission.read(Role.user(safeUserId)),
    Permission.update(Role.user(safeUserId)),
    Permission.delete(Role.user(safeUserId)),
  ]
}

function normalizeNotificationPayload(payload) {
  const safeType = String(payload.type || '').trim()
  if (!VALID_NOTIFICATION_TYPES.includes(safeType)) {
    throw new Error('Notification type is invalid.')
  }

  const safeStatus = String(payload.status || 'unread').trim()
  if (!VALID_NOTIFICATION_STATUSES.includes(safeStatus)) {
    throw new Error('Notification status is invalid.')
  }

  const normalizedChannels = sanitizeStringArray(payload.channels, { maxItems: 4, maxItemLength: 20 })

  return {
    userId: ensureSafeId(payload.userId, 'Notification user ID'),
    type: safeType,
    title: sanitizeTextInput(payload.title, { maxLength: 140 }),
    body: sanitizeTextInput(payload.body, { maxLength: 1000, allowMultiline: true }),
    channels: normalizedChannels.length > 0 ? normalizedChannels : ['in_app'],
    status: safeStatus,
    entityType: sanitizeTextInput(payload.entityType, { maxLength: 40 }) || null,
    entityId: payload.entityId ? ensureSafeId(payload.entityId, 'Entity ID') : null,
    sentAt: payload.sentAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}

export const notificationsService = {
  listUserNotifications: async ({ userId, status = 'all', limit = 50 } = {}) => {
    const safeUserId = ensureSafeId(userId, 'Notification user ID')
    const safeLimit = Math.min(MAX_NOTIFICATION_BATCH, Math.max(1, limit))
    const queries = [Query.equal('userId', safeUserId), Query.orderDesc('$createdAt'), Query.limit(safeLimit)]

    if (status === 'unread') {
      queries.push(Query.equal('status', 'unread'))
    }

    const response = await dbService.listDocuments({
      collectionId: collections.notifications,
      queries,
    })

    return response.documents
  },

  countUnreadNotifications: async ({ userId }) => {
    const safeUserId = ensureSafeId(userId, 'Notification user ID')
    const response = await dbService.listDocuments({
      collectionId: collections.notifications,
      queries: [Query.equal('userId', safeUserId), Query.equal('status', 'unread'), Query.limit(1)],
    })

    return response.total
  },

  createNotification: async (payload) => {
    if (!payload?.userId) {
      throw new Error('Notification userId is required.')
    }

    const data = normalizeNotificationPayload(payload)
    if (!data.title || !data.body) {
      throw new Error('Notification title and body are required.')
    }

    const createdNotification = await dbService.createDocument({
      collectionId: collections.notifications,
      data,
      permissions: buildNotificationPermissions(payload.userId),
    })

    // Optional async channel fan-out (email/SMS/push) handled by Appwrite Function.
    void backendFunctionsService
      .sendNotification({
        notificationId: createdNotification.$id,
        ...data,
        persistInApp: false,
      })
      .catch(() => {
        // Non-blocking function execution failure.
      })

    return createdNotification
  },

  markNotificationAsRead: async ({ notificationId }) =>
    dbService.updateDocument({
      collectionId: collections.notifications,
      documentId: ensureSafeId(notificationId, 'Notification ID'),
      data: {
        status: 'read',
      },
    }),

  markAllAsRead: async ({ userId }) => {
    const safeUserId = ensureSafeId(userId, 'Notification user ID')
    const unreadNotifications = await notificationsService.listUserNotifications({
      userId: safeUserId,
      status: 'unread',
      limit: MAX_NOTIFICATION_BATCH,
    })

    if (unreadNotifications.length === 0) {
      return 0
    }

    await Promise.all(
      unreadNotifications.map((notification) =>
        notificationsService.markNotificationAsRead({
          notificationId: notification.$id,
        }),
      ),
    )

    return unreadNotifications.length
  },
}
