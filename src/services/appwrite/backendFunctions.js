import { appConfig } from '@/constants/appConfig'
import { functionIds } from '@/constants/functionIds'
import { normalizeAppwriteError } from '@/services/appwrite/errors'
import { functionsService } from '@/services/appwrite/functions'

function parseExecutionBody(execution) {
  const body = execution?.responseBody

  if (typeof body !== 'string') {
    return null
  }

  const trimmed = body.trim()
  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

function resolveFunctionId(key) {
  const id = functionIds[key]

  if (!id) {
    throw new Error(`Missing Appwrite function ID for "${key}".`)
  }

  return id
}

async function executeFunction({
  key,
  payload,
  asyncExecution = false,
  path = '/',
  method = 'POST',
  headers = {},
  scheduledAt,
}) {
  if (!appConfig.enableAppwriteFunctions) {
    return {
      executed: false,
      skipped: true,
      reason: 'disabled',
      key,
    }
  }

  try {
    const execution = await functionsService.execute({
      functionId: resolveFunctionId(key),
      payload,
      asyncExecution,
      path,
      method,
      headers,
      scheduledAt,
    })

    return {
      executed: true,
      skipped: false,
      key,
      execution,
      data: parseExecutionBody(execution),
    }
  } catch (error) {
    throw normalizeAppwriteError(error, `Failed to execute "${key}" function.`)
  }
}

export const backendFunctionsService = {
  isEnabled: () => appConfig.enableAppwriteFunctions,

  generateLeasePdf: ({ leaseId, listingId, landlordId, tenantId, leaseData = {} }) =>
    executeFunction({
      key: 'generateLeasePdf',
      payload: {
        leaseId,
        listingId,
        landlordId,
        tenantId,
        leaseData,
      },
    }),

  sendNotification: (payload) =>
    executeFunction({
      key: 'sendNotification',
      payload,
      asyncExecution: true,
    }),

  leaseExpiryReminder: ({ daysAhead = 14 } = {}) =>
    executeFunction({
      key: 'leaseExpiryReminder',
      payload: { daysAhead },
      asyncExecution: true,
    }),

  scanUploadedFile: ({ bucketId, fileId, fileName, mimeType, entityType, entityId, ownerId }) =>
    executeFunction({
      key: 'scanUploadedFile',
      payload: {
        bucketId,
        fileId,
        fileName,
        mimeType,
        entityType,
        entityId,
        ownerId,
      },
      asyncExecution: true,
    }),

  ticketEscalation: ({ maxAgeHours = 72 } = {}) =>
    executeFunction({
      key: 'ticketEscalation',
      payload: { maxAgeHours },
      asyncExecution: true,
    }),
}
