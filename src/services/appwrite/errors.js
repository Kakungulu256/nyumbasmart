function pickErrorMessage(error, fallbackMessage) {
  const code = Number(error?.code)

  if (code === 401) {
    return 'You are not authorized to perform this action.'
  }

  if (code === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (code === 404) {
    return 'The requested resource was not found.'
  }

  if (code === 409) {
    return 'This operation conflicts with existing data.'
  }

  if (code === 413) {
    return 'The uploaded file is too large.'
  }

  if (code === 429) {
    return 'Too many requests. Please try again in a moment.'
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}

export function normalizeAppwriteError(error, fallbackMessage = 'The request could not be completed.') {
  const message = pickErrorMessage(error, fallbackMessage)
  const normalized = new Error(message)

  if (error && typeof error === 'object') {
    if ('code' in error) {
      normalized.code = error.code
    }
    if ('type' in error) {
      normalized.type = error.type
    }
  }

  normalized.cause = error
  return normalized
}
