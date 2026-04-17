import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const KBOS = { lng: -71.0, lat: 42.36 }
const INITIAL_ZOOM = 10
const MAX_EXTRAPOLATE_MS = 20_000

function extrapolate(state, nowMs) {
  const dt = Math.min(nowMs - state.ts, MAX_EXTRAPOLATE_MS) / 1000
  if (!dt || state.onGround || !state.speed || !state.heading) {
    return [state.lon, state.lat]
  }
  const headRad = (state.heading * Math.PI) / 180
  const degPerSec = (state.speed * 1.852) / (3600 * 111.0)
  const lat = state.lat + degPerSec * dt * Math.cos(headRad)
  const lon = state.lon + degPerSec * dt * Math.sin(headRad) / Math.cos(state.lat * Math.PI / 180)
  return [lon, lat]
}

function makeMarkerEl(heading, onGround, selected = false) {
  const color = selected ? '#facc15' : onGround ? '#9ca3af' : '#38bdf8'
  const el = document.createElement('div')
  el.style.cssText = 'width:22px;height:22px;cursor:pointer;'

  const icon = document.createElement('div')
  icon.style.cssText = `width:100%;height:100%;transform:rotate(${heading}deg);`
  icon.innerHTML = `
    <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <rect x="9.5" y="1" width="3" height="15" rx="1.5" fill="${color}"/>
      <path d="M11 7 L1 13.5 L2.5 14.5 L11 10.5 L19.5 14.5 L21 13.5 Z" fill="${color}"/>
      <path d="M11 15 L6.5 18 L7.5 18.5 L11 16.5 L14.5 18.5 L15.5 18 Z" fill="${color}"/>
    </svg>`

  el.appendChild(icon)
  return el
}

// Update an existing marker's icon color without recreating it
function setMarkerColor(marker, color) {
  const svg = marker.getElement().querySelector('svg')
  if (!svg) return
  svg.querySelectorAll('rect, path').forEach(el => el.setAttribute('fill', color))
}

export default function Map({ aircraft, onSelect, selectedId }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const stateRef = useRef({})

  // --- Initialize map once ---
  useEffect(() => {
    if (mapRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [KBOS.lng, KBOS.lat],
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // --- Sync new API data into stateRef and add/remove markers ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !aircraft) return

    const now = Date.now()
    const seenIds = new Set()

    aircraft.forEach((ac) => {
      if (ac.longitude == null || ac.latitude == null) return
      seenIds.add(ac.icao24)

      const prev = stateRef.current[ac.icao24]
      const moved = !prev || prev.lat !== ac.latitude || prev.lon !== ac.longitude
      stateRef.current[ac.icao24] = {
        lat:          ac.latitude,
        lon:          ac.longitude,
        heading:      ac.heading      ?? prev?.heading ?? 0,
        speed:        ac.speed        ?? prev?.speed   ?? 0,
        onGround:     ac.onGround,
        ts:           moved ? now : (prev?.ts ?? now),
        // metadata for the info card
        callsign:     ac.callsign,
        registration: ac.registration,
        type:         ac.type,
        altitude:     ac.altitude,
        icao24:       ac.icao24,
      }

      if (!markersRef.current[ac.icao24]) {
        const isSelected = ac.icao24 === selectedId
        const el = makeMarkerEl(ac.heading ?? 0, ac.onGround, isSelected)

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelect?.(stateRef.current[ac.icao24])
        })

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([ac.longitude, ac.latitude])
          .addTo(map)
        markersRef.current[ac.icao24] = marker
      }
    })

    Object.keys(markersRef.current).forEach((id) => {
      if (!seenIds.has(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
        delete stateRef.current[id]
      }
    })
  }, [aircraft])

  // --- Update icon colors when selection changes ---
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const state = stateRef.current[id]
      if (!state) return
      const color = id === selectedId ? '#facc15' : state.onGround ? '#9ca3af' : '#38bdf8'
      setMarkerColor(marker, color)
    })
  }, [selectedId])

  // --- 60fps animation loop: dead-reckon airborne aircraft between API updates ---
  useEffect(() => {
    let rafId
    const tick = () => {
      const now = Date.now()
      Object.entries(stateRef.current).forEach(([id, state]) => {
        const marker = markersRef.current[id]
        if (!marker || state.onGround) return
        const [lon, lat] = extrapolate(state, now)
        marker.setLngLat([lon, lat])
        const icon = marker.getElement().firstElementChild
        if (icon) icon.style.transform = `rotate(${state.heading ?? 0}deg)`
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />
  )
}
