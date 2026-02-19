import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbServiceMock, notificationsMock, queryMock } = vi.hoisted(() => ({
  dbServiceMock: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
  notificationsMock: {
    createNotification: vi.fn(),
  },
  queryMock: {
    equal: vi.fn((...args) => ({ op: 'equal', args })),
    orderAsc: vi.fn((...args) => ({ op: 'orderAsc', args })),
    orderDesc: vi.fn((...args) => ({ op: 'orderDesc', args })),
    limit: vi.fn((...args) => ({ op: 'limit', args })),
  },
}))

vi.mock('@/services/appwrite/db', () => ({
  dbService: dbServiceMock,
  Query: queryMock,
}))

vi.mock('@/features/notifications/services/notificationsService', () => ({
  notificationsService: notificationsMock,
}))

import { buildConversationId, messagingService } from '@/features/messaging/services/messagingService'

describe('messagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds deterministic conversation IDs regardless of user order', () => {
    const a = buildConversationId('listing_1', 'user_b', 'user_a')
    const b = buildConversationId('listing_1', 'user_a', 'user_b')

    expect(a).toBe('listing_1:user_a:user_b')
    expect(b).toBe('listing_1:user_a:user_b')
  })

  it('rejects sending messages to self', async () => {
    await expect(
      messagingService.sendMessage({
        listingId: 'listing_1',
        senderId: 'user_1',
        receiverId: 'user_1',
        body: 'Hello',
      }),
    ).rejects.toThrow('cannot be the same user')
  })

  it('creates a message and sends recipient notification', async () => {
    dbServiceMock.createDocument.mockResolvedValueOnce({ $id: 'msg_1' })
    notificationsMock.createNotification.mockResolvedValueOnce({ $id: 'notif_1' })

    const result = await messagingService.sendMessage({
      listingId: 'listing_1',
      senderId: 'tenant_1',
      receiverId: 'landlord_1',
      body: '  Hello landlord  ',
    })

    expect(result).toEqual({ $id: 'msg_1' })
    expect(dbServiceMock.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'messages',
        data: expect.objectContaining({
          listingId: 'listing_1',
          senderId: 'tenant_1',
          receiverId: 'landlord_1',
          body: 'Hello landlord',
        }),
      }),
    )
    expect(notificationsMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'landlord_1',
        type: 'message_new',
      }),
    )
  })

  it('marks unread conversation messages as read', async () => {
    dbServiceMock.listDocuments.mockResolvedValueOnce({
      documents: [{ $id: 'm1' }, { $id: 'm2' }],
    })
    dbServiceMock.updateDocument.mockResolvedValue({})

    const updatedCount = await messagingService.markConversationAsRead({
      conversationId: 'listing_1:tenant_1:landlord_1',
      userId: 'landlord_1',
    })

    expect(updatedCount).toBe(2)
    expect(dbServiceMock.updateDocument).toHaveBeenCalledTimes(2)
  })
})
