import { useEffect, useState } from 'react'

// airplanes.live — free, real-time ADS-B, proper CORS (Access-Control-Allow-Origin: *)
// Returns all aircraft within `radius` nautical miles of a point.
const KBOS = { lat: 42.36, lon: -71.0 }
const RADIUS_NM = 60
const POLL_INTERVAL_MS = 10_000

const API_URL = `https://api.airplanes.live/v2/point/${KBOS.lat}/${KBOS.lon}/${RADIUS_NM}`

// airplanes.live already gives altitude in feet and speed in knots — no conversion needed.
const parseAircraft = (ac) => ({
  icao24:       ac.hex,
  callsign:     ac.flight?.trim() || ac.r || 'Unknown',
  registration: ac.r   || null,
  type:         ac.t   || null,
  longitude:    ac.lon,
  latitude:     ac.lat,
  altitude:     typeof ac.alt_baro === 'number' ? ac.alt_baro : 0,
  onGround:     ac.alt_baro === 'ground',
  speed:        Math.round(ac.gs ?? 0),
  heading:      ac.track ?? 0,
})

export function useAircraft() {
  const [aircraft, setAircraft] = useState([])

  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const parsed = (data.ac ?? [])
          .map(parseAircraft)
          .filter((ac) => ac.longitude != null && ac.latitude != null)
        setAircraft(parsed)
      } catch (err) {
        console.warn('Aircraft fetch failed, keeping last data:', err.message)
      }
    }

    fetchAircraft()
    const id = setInterval(fetchAircraft, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return aircraft
}
