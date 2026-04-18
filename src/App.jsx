import { useState } from 'react'
import Map from './components/Map'
import TopBar from './components/TopBar'
import TranscriptionPanel from './components/TranscriptionPanel'
import FlightCard from './components/FlightCard'
import { useAircraft } from './hooks/useAircraft'

export default function App() {
  const aircraft = useAircraft()
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      <Map
        aircraft={aircraft}
        selectedId={selected?.icao24}
        onSelect={setSelected}
      />
      <TopBar aircraftCount={aircraft.length} />
      <FlightCard aircraft={selected} onClose={() => setSelected(null)} />
      <TranscriptionPanel />
    </div>
  )
}
