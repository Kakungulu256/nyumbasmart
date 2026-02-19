import { Client, Databases } from 'node-appwrite'

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

function readHeader(req, key) {
  const headers = req?.headers || {}
  const value = headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()]
  return typeof value === 'string' ? value : ''
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

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const expectedSecret = readEnv('MOMO_WEBHOOK_SECRET')
  if (expectedSecret) {
    const incomingSecret = readHeader(req, 'x-momo-signature')
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return res.json({ ok: false, message: 'Unauthorized webhook signature.' }, 401)
    }
  }

  const payload = parsePayload(req)
  const paymentId = String(payload.paymentId || '').trim()
  const status = String(payload.status || '').trim().toLowerCase()
  const providerReference = String(payload.providerReference || '').trim()

  if (!paymentId || !status) {
    return res.json({ ok: false, message: 'paymentId and status are required.' }, 400)
  }

  const mappedStatus = ['success', 'paid', 'completed'].includes(status)
    ? 'paid'
    : ['failed', 'rejected', 'cancelled'].includes(status)
      ? 'failed'
      : 'processing'

  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const paymentsCollectionId = readEnv('PAYMENTS_COLLECTION_ID', 'payments')

  try {
    if (databaseId) {
      const databases = new Databases(createAdminClient())
      await databases.updateDocument(databaseId, paymentsCollectionId, paymentId, {
        status: mappedStatus,
        providerReference: providerReference || null,
        paidAt: mappedStatus === 'paid' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (updateError) {
    error(`moMoWebhook update failed: ${updateError?.message || updateError}`)
    return res.json({ ok: false, message: 'Unable to process webhook event.' }, 500)
  }

  log(`moMoWebhook processed paymentId=${paymentId} status=${mappedStatus}`)
  return res.json({ ok: true, paymentId, status: mappedStatus }, 200)
}


