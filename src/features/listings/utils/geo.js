const EARTH_RADIUS_KM = 6371

function toRadians(value) {
  return (value * Math.PI) / 180
}

export function calculateDistanceKm(from, to) {
  if (!from || !to) {
    return null
  }

  const lat1 = Number(from.latitude)
  const lon1 = Number(from.longitude)
  const lat2 = Number(to.latitude)
  const lon2 = Number(to.longitude)

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return null
  }

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const rLat1 = toRadians(lat1)
  const rLat2 = toRadians(lat2)

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}
