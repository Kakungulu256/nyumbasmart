import { Client, Storage } from 'node-appwrite'

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.scr', '.msi', '.sh']
const BLOCKED_MIME_PREFIXES = ['application/x-msdownload', 'application/x-sh', 'application/x-bat']

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

function isSuspicious({ fileName, mimeType }) {
  const safeFileName = String(fileName || '').toLowerCase()
  const safeMimeType = String(mimeType || '').toLowerCase()

  const hasBlockedExtension = BLOCKED_EXTENSIONS.some((extension) => safeFileName.endsWith(extension))
  const hasBlockedMimePrefix = BLOCKED_MIME_PREFIXES.some((prefix) => safeMimeType.startsWith(prefix))

  return hasBlockedExtension || hasBlockedMimePrefix
}

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const bucketId = String(payload.bucketId || '').trim()
  const fileId = String(payload.fileId || '').trim()
  const fileName = String(payload.fileName || '').trim()
  const mimeType = String(payload.mimeType || '').trim()

  if (!bucketId || !fileId) {
    return res.json({ ok: false, message: 'bucketId and fileId are required.' }, 400)
  }

  const suspicious = isSuspicious({ fileName, mimeType })
  let deleted = false
  const shouldDelete = readEnv('DELETE_SUSPICIOUS_UPLOADS', 'false') === 'true'

  if (suspicious && shouldDelete) {
    try {
      const storage = new Storage(createAdminClient())
      await storage.deleteFile(bucketId, fileId)
      deleted = true
    } catch (deleteError) {
      error(`scanUploadedFile delete failed: ${deleteError?.message || deleteError}`)
      return res.json({ ok: false, message: 'Suspicious file detected but deletion failed.' }, 500)
    }
  }

  log(`scanUploadedFile bucket=${bucketId} file=${fileId} suspicious=${suspicious} deleted=${deleted}`)

  return res.json(
    {
      ok: true,
      bucketId,
      fileId,
      suspicious,
      deleted,
      verdict: suspicious ? 'suspicious' : 'clean',
    },
    200,
  )
}


