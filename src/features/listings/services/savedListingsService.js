const STORAGE_KEY_PREFIX = 'nyumba:saved-listings'

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}:${userId}`
}

function normalizeIds(rawValue) {
  if (!Array.isArray(rawValue)) {
    return []
  }

  return [...new Set(rawValue.map((value) => String(value || '').trim()).filter(Boolean))]
}

function readSavedIds(userId) {
  if (!userId || typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) {
      return []
    }

    return normalizeIds(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeSavedIds(userId, listingIds) {
  if (!userId || typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey(userId), JSON.stringify(normalizeIds(listingIds)))
}

export const savedListingsService = {
  listSavedListingIds: ({ userId }) => readSavedIds(userId),

  isListingSaved: ({ userId, listingId }) => {
    if (!listingId) {
      return false
    }

    return readSavedIds(userId).includes(String(listingId))
  },

  toggleSavedListing: ({ userId, listingId }) => {
    const normalizedListingId = String(listingId || '').trim()
    if (!userId || !normalizedListingId) {
      return {
        saved: false,
        listingIds: readSavedIds(userId),
      }
    }

    const currentIds = readSavedIds(userId)
    const exists = currentIds.includes(normalizedListingId)
    const nextIds = exists ? currentIds.filter((id) => id !== normalizedListingId) : [normalizedListingId, ...currentIds]

    writeSavedIds(userId, nextIds)

    return {
      saved: !exists,
      listingIds: nextIds,
    }
  },
}
