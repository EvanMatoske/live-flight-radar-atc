export default function TopBar({ aircraftCount }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.1em' }}>KBOS</span>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Boston Logan</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {aircraftCount != null && (
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{aircraftCount} aircraft</span>
        )}
        <span
          title="Live"
          style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}
        />
      </div>
    </div>
  )
}
