export default function FlightCard({ aircraft, onClose }) {
  if (!aircraft) return null

  const rows = [
    { label: 'Registration', value: aircraft.registration || '—' },
    { label: 'Type',         value: aircraft.type         || '—' },
    { label: 'Altitude',     value: aircraft.onGround ? 'On ground' : `${aircraft.altitude?.toLocaleString()} ft` },
    { label: 'Speed',        value: aircraft.onGround ? '—' : `${aircraft.speed} kts` },
    { label: 'Heading',      value: aircraft.onGround ? '—' : `${Math.round(aircraft.heading)}°` },
  ]

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(56px + env(safe-area-inset-top))',
      right: 12,
      zIndex: 20,
      background: 'rgba(15, 15, 20, 0.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '14px 16px',
      minWidth: 210,
      color: '#fff',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1 }}>
            {aircraft.callsign}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {aircraft.icao24}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '4px 8px',
            marginLeft: 12,
          }}
        >
          ✕
        </button>
      </div>

      {/* Data rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#e5e7eb' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
