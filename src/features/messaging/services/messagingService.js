import { Permission, Role } from 'appwrite'

import { collections } from '@/constants/collections'
import { dbService, Query } from '@/services/appwrite/db'

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

function buildMessagePermissions(senderId, receiverId) {
  return [
    Permission.read(Role.user(senderId)),
    Permission.read(Role.user(receiverId)),
    Permission.update(Role.user(senderId)),
    Permission.update(Role.user(receiverId)),
    Permission.delete(Role.user(senderId)),
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
  if (!listingId || !userAId || !userBId) {
    throw new Error('Missing conversation ID inputs.')
  }

  const [firstUserId, secondUserId] = [userAId, userBId].sort()
  return `${listingId}:${firstUserId}:${secondUserId}`
}

export const messagingService = {
  listUserConversations: async ({ userId }) => {
    const [sentMessages, receivedMessages] = await Promise.all([
      dbService.listDocuments({
        collectionId: collections.messages,
        queries: [Query.equal('senderId', userId), Query.orderDesc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
      }),
      dbService.listDocuments({
        collectionId: collections.messages,
        queries: [Query.equal('receiverId', userId), Query.orderDesc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
      }),
    ])

    const allMessages = dedupeById([...sentMessages.documents, ...receivedMessages.documents])
    return createConversationSummaryMap(sortByCreatedAtDescending(allMessages), userId)
  },

  listConversationMessages: async ({ conversationId }) => {
    const response = await dbService.listDocuments({
      collectionId: collections.messages,
      queries: [Query.equal('conversationId', conversationId), Query.orderAsc('$createdAt'), Query.limit(MESSAGE_BATCH_LIMIT)],
    })

    return response.documents
  },

  sendMessage: async ({ listingId, senderId, receiverId, body }) => {
    const text = String(body || '').trim()
    if (!text) {
      throw new Error('Message cannot be empty.')
    }

    const conversationId = buildConversationId(listingId, senderId, receiverId)

    return dbService.createDocument({
      collectionId: collections.messages,
      data: {
        conversationId,
        listingId,
        senderId,
        receiverId,
        body: text,
        read: false,
        createdAt: new Date().toISOString(),
      },
      permissions: buildMessagePermissions(senderId, receiverId),
    })
  },

  markConversationAsRead: async ({ conversationId, userId }) => {
    const unreadResponse = await dbService.listDocuments({
      collectionId: collections.messages,
      queries: [
        Query.equal('conversationId', conversationId),
        Query.equal('receiverId', userId),
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
