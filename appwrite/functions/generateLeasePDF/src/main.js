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
  const { leaseId, listingId, landlordId, tenantId, leaseData = {} } = payload

  if (![leaseId, listingId, landlordId, tenantId].every(required)) {
    return res.json(
      {
        ok: false,
        message: 'leaseId, listingId, landlordId, and tenantId are required.',
      },
      400,
    )
  }

  const generatedAt = new Date().toISOString()
  const leaseNumber = `LEASE-${String(leaseId).slice(-6).toUpperCase()}`

  // Baseline placeholder: replace with real PDF generation logic and storage upload.
  return res.json(
    {
      ok: true,
      message: 'Lease PDF generation placeholder executed.',
      leaseId,
      leaseNumber,
      listingId,
      landlordId,
      tenantId,
      generatedAt,
      fileName: `${leaseNumber}.pdf`,
      leaseData,
    },
    200,
  )
}


