const APPWRITE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function toStringValue(value) {
  return String(value ?? '').trim()
}

export function ensureSafeId(value, label = 'ID') {
  const normalizedValue = toStringValue(value)

  if (!normalizedValue) {
    throw new Error(`${label} is required.`)
  }

  if (!APPWRITE_ID_PATTERN.test(normalizedValue)) {
    throw new Error(`${label} format is invalid.`)
  }

  return normalizedValue
}

export function sanitizeTextInput(value, { maxLength = 1000, allowMultiline = false } = {}) {
  const rawValue = toStringValue(value)
  const cleanedValue = Array.from(rawValue)
    .filter((character) => {
      const code = character.charCodeAt(0)

      if (code === 127) {
        return false
      }

      if (code < 32) {
        if (allowMultiline && (code === 9 || code === 10 || code === 13)) {
          return true
        }

        return false
      }

      return true
    })
    .join('')

  return cleanedValue.length > maxLength ? cleanedValue.slice(0, maxLength) : cleanedValue
}

export function ensureFiniteNumber(
  value,
  {
    label = 'Value',
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    integer = false,
  } = {},
) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a valid number.`)
  }

  if (integer && !Number.isInteger(parsedValue)) {
    throw new Error(`${label} must be a whole number.`)
  }

  if (parsedValue < min || parsedValue > max) {
    throw new Error(`${label} is out of allowed range.`)
  }

  return parsedValue
}

export function sanitizeCode(value, { label = 'Code', exactLength } = {}) {
  const normalizedValue = sanitizeTextInput(value, {
    maxLength: exactLength || 12,
    allowMultiline: false,
  }).toUpperCase()

  if (!normalizedValue) {
    throw new Error(`${label} is required.`)
  }

  if (exactLength && normalizedValue.length !== exactLength) {
    throw new Error(`${label} must be exactly ${exactLength} characters.`)
  }

  if (!/^[A-Z0-9]+$/.test(normalizedValue)) {
    throw new Error(`${label} contains unsupported characters.`)
  }

  return normalizedValue
}

export function sanitizeStringArray(
  values,
  {
    maxItems = 20,
    maxItemLength = 120,
    allowMultiline = false,
  } = {},
) {
  const list = Array.isArray(values) ? values : []

  return [...new Set(list.map((value) => sanitizeTextInput(value, { maxLength: maxItemLength, allowMultiline })).filter(Boolean))].slice(0, maxItems)
}

export function hasAllowedFileExtension(fileName, allowedExtensions = []) {
  if (allowedExtensions.length === 0) {
    return true
  }

  const extension = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase()

  if (!extension) {
    return false
  }

  return allowedExtensions.includes(extension)
}
