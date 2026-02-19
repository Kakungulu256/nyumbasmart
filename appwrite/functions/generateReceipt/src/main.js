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

function required(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default async ({ req, res }) => {
  if (req.method !== 'POST') {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const { paymentId, leaseId, tenantId, landlordId, amount, currency = 'UGX' } = payload

  if (![paymentId, leaseId, tenantId, landlordId].every(required)) {
    return res.json(
      {
        ok: false,
        message: 'paymentId, leaseId, tenantId, and landlordId are required.',
      },
      400,
    )
  }

  const safeAmount = Number(amount)
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return res.json({ ok: false, message: 'A valid amount is required.' }, 400)
  }

  const generatedAt = new Date().toISOString()
  const receiptCode = `RCT-${String(paymentId).slice(-8).toUpperCase()}`

  // Baseline placeholder: replace with real PDF/HTML receipt generation and storage upload.
  return res.json(
    {
      ok: true,
      message: 'Receipt generation placeholder executed.',
      receiptCode,
      paymentId,
      leaseId,
      tenantId,
      landlordId,
      amount: safeAmount,
      currency,
      generatedAt,
      fileName: `${receiptCode}.pdf`,
    },
    200,
  )
}


