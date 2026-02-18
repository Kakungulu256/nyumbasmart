export function getAuthErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) {
    return fallback
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallback
}

export function getPostLoginRoute(role) {
  if (role === 'landlord') {
    return '/dashboard/landlord'
  }

  if (role === 'tenant') {
    return '/dashboard/tenant'
  }

  return '/listings'
}
