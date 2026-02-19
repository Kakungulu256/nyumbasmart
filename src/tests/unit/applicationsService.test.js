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

import { applicationsService } from '@/features/applications/services/applicationsService'

describe('applicationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks submitting a second active application for the same listing', async () => {
    dbServiceMock.listDocuments.mockResolvedValueOnce({
      documents: [{ $id: 'app_existing' }],
    })

    await expect(
      applicationsService.submitApplication({
        tenantId: 'tenant_1',
        landlordId: 'landlord_1',
        listingId: 'listing_1',
        coverNote: 'I am interested.',
      }),
    ).rejects.toThrow('already have an active application')

    expect(dbServiceMock.createDocument).not.toHaveBeenCalled()
  })

  it('creates an application and sends landlord notification', async () => {
    dbServiceMock.listDocuments.mockResolvedValueOnce({ documents: [] })
    dbServiceMock.createDocument.mockResolvedValueOnce({ $id: 'app_1' })
    notificationsMock.createNotification.mockResolvedValueOnce({ $id: 'notif_1' })

    const result = await applicationsService.submitApplication({
      tenantId: 'tenant_1',
      landlordId: 'landlord_1',
      listingId: 'listing_1',
      coverNote: 'Ready to move in soon',
    })

    expect(result).toEqual({ $id: 'app_1' })
    expect(dbServiceMock.createDocument).toHaveBeenCalledTimes(1)
    expect(dbServiceMock.createDocument.mock.calls[0][0]).toMatchObject({
      collectionId: 'applications',
      data: {
        listingId: 'listing_1',
        tenantId: 'tenant_1',
        landlordId: 'landlord_1',
        status: 'pending',
      },
    })
    expect(notificationsMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'landlord_1',
        type: 'application_new',
        entityId: 'app_1',
      }),
    )
  })

  it('accepts pending application and notifies tenant', async () => {
    dbServiceMock.updateDocument.mockResolvedValueOnce({
      $id: 'app_2',
      status: 'accepted',
    })
    notificationsMock.createNotification.mockResolvedValueOnce({ $id: 'notif_2' })

    await applicationsService.acceptApplication({
      application: {
        $id: 'app_2',
        status: 'pending',
        tenantId: 'tenant_2',
      },
    })

    expect(dbServiceMock.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'applications',
        documentId: 'app_2',
        data: { status: 'accepted' },
      }),
    )
    expect(notificationsMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tenant_2',
        type: 'application_accepted',
      }),
    )
  })
})
