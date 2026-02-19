import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { notificationsService } from '@/features/notifications/services/notificationsService'
import { dbService, Query } from '@/services/appwrite/db'
import { ensureSafeId, sanitizeTextInput } from '@/utils/security'

const MESSAGE_BATCH_LIMIT = 200

function dedupeById(items) {
  const map = new Map()
  items.forEach((item) => {
    map.set(item.$id, item)
  })
  return Array.from(map.values())
}

function sortByCreatedAtDescending(items) {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.$createdAt || 0).getTime()
    const timeB = new Date(b.createdAt || b.$createdAt || 0).getTime()
    return timeB - timeA
  })
}

export function buildMessagePermissions(senderId, receiverId) {
  const safeSenderId = ensureSafeId(senderId, 'Sender ID')
  const safeReceiverId = ensureSafeId(receiverId, 'Receiver ID')

  return [
    Permission.read(Role.user(safeSenderId)),
    Permission.read(Role.user(safeReceiverId)),
    Permission.update(Role.user(safeSenderId)),
    Permission.update(Role.user(safeReceiverId)),
    Permission.delete(Role.user(safeSenderId)),
  ]
}

function createConversationSummaryMap(messages, currentUserId) {
  const summaryMap = new Map()

  messages.forEach((message) => {
    const conversationId = message.conversationId
    if (!conversationId) {
      return
    }

    const lastMessageAt = message.createdAt || message.$createdAt
    const participantId = message.senderId === currentUserId ? message.receiverId : message.senderId
    const isUnreadIncoming = message.receiverId === currentUserId && !message.read

    const existingSummary = summaryMap.get(conversationId)
    if (!existingSummary) {
      summaryMap.set(conversationId, {
        conversationId,
        listingId: message.listingId,
        participantId,
        lastMessageBody: message.body,
        lastMessageAt,
        unreadCount: isUnreadIncoming ? 1 : 0,
      })
      return
    }

    const existingTime = new Date(existingSummary.lastMessageAt || 0).getTime()
    const messageTime = new Date(lastMessageAt || 0).getTime()

    if (messageTime >= existingTime) {
      existingSummary.lastMessageBody = message.body
      existingSummary.lastMessageAt = lastMessageAt
      existingSummary.listingId = message.listingId
      existingSummary.participantId = participantId
    }

    if (isUnreadIncoming) {
      existingSummary.unreadCount += 1
    }
  })

  return Array.from(summaryMap.values()).sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || 0).getTime()
    const timeB = new Date(b.lastMessageAt || 0).getTime()
    return timeB - timeA
  })
}

export function buildConversationId(listingId, userAId, userBId) {
  const safeListingId = ensureSafeId(listingId, 'Listing ID')
  const safeUserAId = ensureSafeId(userAId, 'User ID')
  const safeUserBId = ensureSafeId(userBId, 'User ID')

  const [firstUserId, secondUserId] = [safeUserAId, safeUserBId].sort()
  return `${safeListingId}:${firstUserId}:${secondUserId}`
}

export const messagingService = {
  listUserConversations: async ({ userId }) => {
    const safeUserId = ensureSafeId(userId, 'User ID')
    const [sentMessages, receivedMessages] = await Promise.all([
      dbService.listDocuments({
        collectionId: collections.messages,
        queries: [Query.equal('senderId', safeUserId), Query.orderDesc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
      }),
      dbService.listDocuments({
        collectionId: collections.messages,
        queries: [Query.equal('receiverId', safeUserId), Query.orderDesc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
      }),
    ])

    const allMessages = dedupeById([...sentMessages.documents, ...receivedMessages.documents])
    return createConversationSummaryMap(sortByCreatedAtDescending(allMessages), safeUserId)
  },

  listConversationMessages: async ({ conversationId }) => {
    const safeConversationId = ensureSafeId(conversationId, 'Conversation ID')

    const response = await dbService.listDocuments({
      collectionId: collections.messages,
      queries: [Query.equal('conversationId', safeConversationId), Query.orderAsc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
    })

    return response.documents
  },

  sendMessage: async ({ listingId, senderId, receiverId, body }) => {
    const safeSenderId = ensureSafeId(senderId, 'Sender ID')
    const safeReceiverId = ensureSafeId(receiverId, 'Receiver ID')
    const safeListingId = ensureSafeId(listingId, 'Listing ID')

    if (safeSenderId === safeReceiverId) {
      throw new Error('Sender and receiver cannot be the same user.')
    }

    const text = sanitizeTextInput(body, { maxLength: 1000, allowMultiline: true })
    if (!text) {
      throw new Error('Message cannot be empty.')
    }

    const conversationId = buildConversationId(safeListingId, safeSenderId, safeReceiverId)

    const createdMessage = await dbService.createDocument({
      collectionId: collections.messages,
      data: {
        conversationId,
        listingId: safeListingId,
        senderId: safeSenderId,
        receiverId: safeReceiverId,
        body: text,
        read: false,
        createdAt: new Date().toISOString(),
      },
      permissions: buildMessagePermissions(safeSenderId, safeReceiverId),
    })

    if (safeReceiverId !== safeSenderId) {
      try {
        await notificationsService.createNotification({
          userId: safeReceiverId,
          type: 'message_new',
          title: 'New message',
          body: 'You received a new message in your inbox.',
          entityType: 'conversation',
          entityId: conversationId,
        })
      } catch {
        // Non-blocking notification failure.
      }
    }

    return createdMessage
  },

  markConversationAsRead: async ({ conversationId, userId }) => {
    const safeConversationId = ensureSafeId(conversationId, 'Conversation ID')
    const safeUserId = ensureSafeId(userId, 'User ID')

    const unreadResponse = await dbService.listDocuments({
      collectionId: collections.messages,
      queries: [
        Query.equal('conversationId', safeConversationId),
        Query.equal('receiverId', safeUserId),
        Query.equal('read', false),
        Query.limit(MESSAGE_BATCH_LIMIT),
      ],
    })

    if (unreadResponse.documents.length === 0) {
      return 0
    }

    await Promise.all(
      unreadResponse.documents.map((message) =>
        dbService.updateDocument({
          collectionId: collections.messages,
          documentId: message.$id,
          data: { read: true },
        }),
      ),
    )

    return unreadResponse.documents.length
  },
}
