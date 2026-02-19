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

function createAdminClient() {
  const endpoint = readEnv('APPWRITE_FUNCTION_API_ENDPOINT', readEnv('APPWRITE_ENDPOINT'))
  const projectId = readEnv('APPWRITE_FUNCTION_PROJECT_ID', readEnv('APPWRITE_PROJECT_ID'))
  const apiKey = readEnv('APPWRITE_API_KEY')

  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Missing Appwrite environment configuration for function runtime.')
  }

  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
}

function required(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const { paymentId, leaseId, tenantId, phoneNumber, amount, currency = 'UGX', provider = 'mtn_momo' } = payload

  if (![paymentId, leaseId, tenantId, phoneNumber].every(required)) {
    return res.json(
      {
        ok: false,
        message: 'paymentId, leaseId, tenantId, and phoneNumber are required.',
      },
      400,
    )
  }

  const safeAmount = Number(amount)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return res.json({ ok: false, message: 'A valid amount is required.' }, 400)
  }

  const providerReference = `MOMO-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const status = 'processing'
  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const paymentsCollectionId = readEnv('PAYMENTS_COLLECTION_ID', 'payments')

  try {
    if (databaseId) {
      const databases = new Databases(createAdminClient())

      await databases.updateDocument(databaseId, paymentsCollectionId, paymentId, {
        status,
        provider,
        providerReference,
        amount: safeAmount,
        currency,
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (updateError) {
    error(`processMoMoPayment update failed: ${updateError?.message || updateError}`)
    return res.json(
      {
        ok: false,
        message: 'Payment initialization failed.',
      },
      500,
    )
  }

  log(`MoMo payment initialized for paymentId=${paymentId}`)

  return res.json(
    {
      ok: true,
      paymentId,
      leaseId,
      tenantId,
      amount: safeAmount,
      currency,
      provider,
      providerReference,
      status,
      message: 'MoMo payment initialized.',
    },
    200,
  )
}


