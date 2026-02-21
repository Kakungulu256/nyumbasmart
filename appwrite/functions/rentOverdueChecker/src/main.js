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

async function createOverdueNotification(databases, databaseId, notificationsCollectionId, userId, paymentId) {
  if (!userId) {
    return
  }

  await databases.createDocument(
    databaseId,
    notificationsCollectionId,
    ID.unique(),
    {
      userId,
      type: 'payment_overdue',
      title: 'Rent payment overdue',
      body: 'Your rent payment is overdue. Please complete payment as soon as possible.',
      channels: ['in_app'],
      status: 'unread',
      entityType: 'payment',
      entityId: paymentId || null,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
  )
}

export default async ({ req, res, log, error }) => {
  if (readEnv('ENABLE_PAYMENTS', 'false') !== 'true') {
    return res.json(
      {
        ok: false,
        message: 'Rent overdue checks are currently disabled in this deployment.',
      },
      410,
    )
  }

  if (!['POST', 'GET'].includes(req.method)) {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const gracePeriodDays = Math.max(0, Math.min(30, Number(payload.gracePeriodDays || 0)))
  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const paymentsCollectionId = readEnv('PAYMENTS_COLLECTION_ID', 'payments')
  const notificationsCollectionId = readEnv('NOTIFICATIONS_COLLECTION_ID', 'notifications')

  if (!databaseId) {
    return res.json({ ok: false, message: 'APPWRITE_DATABASE_ID is required.' }, 400)
  }

  const now = Date.now()
  const graceMs = gracePeriodDays * 24 * 60 * 60 * 1000
  let updatedCount = 0

  try {
    const databases = new Databases(createAdminClient())
    const paymentsResponse = await databases.listDocuments(databaseId, paymentsCollectionId, [
      Query.equal('status', ['pending', 'processing', 'overdue']),
      Query.limit(500),
    ])

    for (const payment of paymentsResponse.documents) {
      const dueTime = toTime(payment.dueDate)
      if (!dueTime || dueTime + graceMs > now) {
        continue
      }

      await databases.updateDocument(databaseId, paymentsCollectionId, payment.$id, {
        status: 'overdue',
        updatedAt: new Date().toISOString(),
      })

      await createOverdueNotification(databases, databaseId, notificationsCollectionId, payment.tenantId, payment.$id)
      updatedCount += 1
    }
  } catch (executionError) {
    error(`rentOverdueChecker failed: ${executionError?.message || executionError}`)
    return res.json({ ok: false, message: 'Rent overdue check failed.' }, 500)
  }

  log(`rentOverdueChecker completed with updatedCount=${updatedCount}`)
  return res.json({ ok: true, gracePeriodDays, updatedCount }, 200)
}


