import { Functions } from 'appwrite'

import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

export const functions = new Functions(appwriteClient)

function serializePayload(payload) {
  if (payload === undefined || payload === null) {
    return ''
  }

  return typeof payload === 'string' ? payload : JSON.stringify(payload)
}

export const functionsService = {
  execute: async ({
    functionId,
    payload,
    asyncExecution = false,
    path = '/',
    method = 'POST',
    headers = {},
    scheduledAt,
  }) => {
    ensureAppwriteConfigured()

    if (!functionId) {
      throw new Error('Missing Appwrite function ID.')
    }

    return functions.createExecution(
      functionId,
      serializePayload(payload),
      asyncExecution,
      path,
      method,
      headers,
      scheduledAt,
    )
  },
}
