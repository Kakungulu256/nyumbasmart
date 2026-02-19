import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite'

function parsePayload(req) {
  const rawBody = req?.body

  if (!rawBody) {
    return {}
  }

  if (typeof rawBody === 'object') {
    return rawBody
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return {}
  }
}

function readEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function createAdminClient() {
  const endpoint = readEnv('APPWRITE_FUNCTION_API_ENDPOINT', readEnv('APPWRITE_ENDPOINT'))
  const projectId = readEnv('APPWRITE_FUNCTION_PROJECT_ID', readEnv('APPWRITE_PROJECT_ID'))
  const apiKey = readEnv('APPWRITE_API_KEY')

  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Missing Appwrite environment configuration for function runtime.')
  }

  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
}

function toTime(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

async function createEscalationNotification(databases, databaseId, notificationsCollectionId, userId, ticketId) {
  if (!userId) {
    return
  }

  await databases.createDocument(
    databaseId,
    notificationsCollectionId,
    ID.unique(),
    {
      userId,
      type: 'maintenance_updated',
      title: 'Maintenance ticket escalated',
      body: 'A maintenance ticket has been escalated due to inactivity.',
      channels: ['in_app'],
      status: 'unread',
      entityType: 'maintenance_ticket',
      entityId: ticketId || null,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
  )
}

export default async ({ req, res, log, error }) => {
  if (!['POST', 'GET'].includes(req.method)) {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const maxAgeHours = Math.max(1, Math.min(720, Number(payload.maxAgeHours || 72)))
  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const maintenanceCollectionId = readEnv('MAINTENANCE_TICKETS_COLLECTION_ID', 'maintenanceTickets')
  const notificationsCollectionId = readEnv('NOTIFICATIONS_COLLECTION_ID', 'notifications')

  if (!databaseId) {
    return res.json({ ok: false, message: 'APPWRITE_DATABASE_ID is required.' }, 400)
  }

  const now = Date.now()
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  let escalatedCount = 0

  try {
    const databases = new Databases(createAdminClient())
    const ticketsResponse = await databases.listDocuments(databaseId, maintenanceCollectionId, [
      Query.equal('status', ['open', 'in_progress']),
      Query.limit(500),
    ])

    for (const ticket of ticketsResponse.documents) {
      const createdTime = toTime(ticket.createdAt || ticket.$createdAt)
      const isOldEnough = createdTime > 0 && now - createdTime >= maxAgeMs
      const priority = String(ticket.priority || '').toLowerCase()

      if (!isOldEnough || ['high', 'urgent', 'critical'].includes(priority)) {
        continue
      }

      await databases.updateDocument(databaseId, maintenanceCollectionId, ticket.$id, {
        priority: 'high',
        updatedAt: new Date().toISOString(),
      })

      await createEscalationNotification(databases, databaseId, notificationsCollectionId, ticket.landlordId, ticket.$id)
      escalatedCount += 1
    }
  } catch (executionError) {
    error(`ticketEscalation failed: ${executionError?.message || executionError}`)
    return res.json({ ok: false, message: 'Ticket escalation execution failed.' }, 500)
  }

  log(`ticketEscalation completed with escalatedCount=${escalatedCount}`)
  return res.json({ ok: true, maxAgeHours, escalatedCount }, 200)
}


