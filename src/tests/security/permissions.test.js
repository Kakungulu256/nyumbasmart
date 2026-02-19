import { describe, expect, it } from 'vitest'
import { Permission, Role } from 'appwrite'

import { buildApplicationPermissions } from '@/features/applications/services/applicationsService'
import { buildListingPermissions } from '@/features/listings/services/listingsService'
import { buildMessagePermissions } from '@/features/messaging/services/messagingService'
import { buildNotificationPermissions } from '@/features/notifications/services/notificationsService'

describe('Permission builders', () => {
  it('creates strict landlord permissions for draft listings', () => {
    const permissions = buildListingPermissions({
      landlordId: 'landlord_123',
      isPublished: false,
    })

    expect(permissions).toContain(Permission.read(Role.user('landlord_123')))
    expect(permissions).toContain(Permission.update(Role.user('landlord_123')))
    expect(permissions).toContain(Permission.delete(Role.user('landlord_123')))
    expect(permissions).not.toContain(Permission.read(Role.any()))
  })

  it('adds public read permission for published listings', () => {
    const permissions = buildListingPermissions({
      landlordId: 'landlord_123',
      isPublished: true,
    })

    expect(permissions).toContain(Permission.read(Role.any()))
  })

  it('builds tenant-landlord application permissions', () => {
    const permissions = buildApplicationPermissions('tenant_1', 'landlord_1')

    expect(permissions).toContain(Permission.read(Role.user('tenant_1')))
    expect(permissions).toContain(Permission.read(Role.user('landlord_1')))
    expect(permissions).toContain(Permission.update(Role.user('tenant_1')))
    expect(permissions).toContain(Permission.update(Role.user('landlord_1')))
    expect(permissions).toContain(Permission.delete(Role.user('tenant_1')))
  })

  it('builds sender/receiver permissions for messages', () => {
    const permissions = buildMessagePermissions('sender_1', 'receiver_1')

    expect(permissions).toContain(Permission.read(Role.user('sender_1')))
    expect(permissions).toContain(Permission.read(Role.user('receiver_1')))
    expect(permissions).toContain(Permission.update(Role.user('sender_1')))
    expect(permissions).toContain(Permission.update(Role.user('receiver_1')))
    expect(permissions).toContain(Permission.delete(Role.user('sender_1')))
  })

  it('builds single-user permissions for notifications', () => {
    const permissions = buildNotificationPermissions('user_1')

    expect(permissions).toContain(Permission.read(Role.user('user_1')))
    expect(permissions).toContain(Permission.update(Role.user('user_1')))
    expect(permissions).toContain(Permission.delete(Role.user('user_1')))
  })
})
