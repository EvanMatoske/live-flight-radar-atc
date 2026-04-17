import { useRef, useState } from 'react'

// Direct Icecast stream URLs from LiveATC — confirmed working for KBOS.
// Note: these are HTTP streams; they work fine on localhost and in installed PWAs,
// but browsers will block them on HTTPS pages (mixed content).
// We'll handle HTTPS deployment separately.
const FREQUENCIES = [
  { name: 'Logan Tower',      mhz: '128.8', url: 'http://d.liveatc.net/kbos_twr' },
  { name: 'Ground Control',   mhz: '121.9', url: 'http://d.liveatc.net/kbos_gnd' },
  { name: 'Boston Departure', mhz: '135.9', url: 'http://d.liveatc.net/kbos_dep' },
]

export default function AudioPlayer() {
  const [expanded, setExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  const current = FREQUENCIES[activeIndex]

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.src = current.url
      audio.play().catch((e) => {
        console.error('Audio play failed:', e)
        setPlaying(false)
      })
      setPlaying(true)
    }
  }

  const selectFrequency = (index) => {
    const audio = audioRef.current
    if (!audio) return
    setActiveIndex(index)
    setPlaying(true)
    audio.src = FREQUENCIES[index].url
    audio.play().catch((e) => {
      console.error('Audio play failed:', e)
      setPlaying(false)
    })
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}
    >
      <audio ref={audioRef} />

      {/* Expanded frequency list */}
      {expanded && (
        <div className="bg-black/80 backdrop-blur-md border-t border-white/10 px-4 pt-3 pb-2">
          {FREQUENCIES.map((freq, i) => (
            <button
              key={freq.mhz}
              onClick={() => selectFrequency(i)}
              className={`w-full flex items-center justify-between py-3 border-b border-white/5 last:border-0
                          text-left transition-colors
                          ${i === activeIndex ? 'text-green-400' : 'text-gray-300 hover:text-white'}`}
            >
              <span className="font-medium">{freq.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{freq.mhz} MHz</span>
                {i === activeIndex && playing && (
                  <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                    LIVE
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Collapsed strip */}
      <div
        className="bg-black/80 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3 cursor-pointer select-none relative"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Drag handle */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-10 h-1 bg-white/30 rounded-full" />

        {/* Play / pause */}
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shrink-0 transition-colors"
        >
          {playing ? (
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-black translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Now Playing</p>
          <p className="text-white text-sm font-medium truncate">{current.name}</p>
        </div>

        <span className="text-sm text-gray-400 shrink-0">{current.mhz} MHz</span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
    </div>
  )
}
