import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

import { formatCurrency } from '@/utils/currency'

function resolveMapCenter(listings, userLocation) {
  if (userLocation) {
    return [userLocation.latitude, userLocation.longitude]
  }

  if (listings.length > 0) {
    const firstListing = listings[0]
    return [firstListing.latitude, firstListing.longitude]
  }

  return [0.3476, 32.5825]
}

function MapViewportController({ listings, userLocation }) {
  const map = useMap()
  const points = useMemo(() => {
    const nextPoints = listings
      .map((listing) => [Number(listing.latitude), Number(listing.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

    if (userLocation) {
      nextPoints.push([userLocation.latitude, userLocation.longitude])
    }

    return nextPoints
  }, [listings, userLocation])

  useEffect(() => {
    if (points.length === 0) {
      return
    }

    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }

    map.fitBounds(points, { padding: [30, 30], maxZoom: 15 })
  }, [map, points])

  return null
}

function ListingPin({ listing }) {
  const latitude = Number(listing.latitude)
  const longitude = Number(listing.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return (
    <CircleMarker center={[latitude, longitude]} pathOptions={{ color: '#047857', fillColor: '#10b981', fillOpacity: 0.8, weight: 2 }} radius={8}>
      <Popup>
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">{listing.title}</p>
          <p className="text-sm text-slate-600">
            {listing.city}, {listing.country}
          </p>
          <p className="text-sm font-semibold text-brand-900">{formatCurrency(Number(listing.rentAmount || 0), listing.currency || 'UGX')}</p>
          <Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/listings/${listing.$id}`}>
            View listing
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export function ListingsMapView({ listings, userLocation }) {
  const center = resolveMapCenter(listings, userLocation)

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} className="h-full w-full" zoom={13}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController listings={listings} userLocation={userLocation} />

        {userLocation && (
          <CircleMarker center={[userLocation.latitude, userLocation.longitude]} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }} radius={9}>
            <Popup>Your location</Popup>
          </CircleMarker>
        )}

        {listings.map((listing) => (
          <ListingPin key={listing.$id} listing={listing} />
        ))}
      </MapContainer>
    </div>
  )
}
