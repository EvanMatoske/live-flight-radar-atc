import { useRef, useState } from 'react'

const SERVER = 'http://localhost:3002'


function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// POST file to local server, read back newline-delimited JSON segments as they stream in
async function* transcribeStream(file, onProgress) {
  const body = new FormData()
  body.append('file', file)

  const res = await fetch(`${SERVER}/api/transcribe`, { method: 'POST', body })
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`)

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buf     = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()  // keep incomplete line in buffer
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line)
    }
  }
}

export default function TranscriptionPanel() {
  const [expanded, setExpanded]     = useState(false)
  const [status, setStatus]         = useState('idle')   // idle | loading | done | error
  const [progress, setProgress]     = useState('')
  const [segments, setSegments]     = useState([])
  const [fileName, setFileName]     = useState(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const fileInputRef                = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setSegments([])
    setErrorMsg('')
    setProgress('')
    setStatus('loading')
    setExpanded(true)

    try {
      setProgress('Transcribing…')
      const allSegments = []
      for await (const seg of transcribeStream(file)) {
        allSegments.push(seg)
        setSegments([...allSegments])
      }
      setProgress('')
      setStatus('done')
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const openPicker = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 16px',
          maxHeight: '40vh',
          overflowY: 'auto',
        }}>
          {status === 'loading' && (
            <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '8px 0 4px' }}>
              {progress || 'Preparing…'}
            </div>
          )}

          {status === 'error' && (
            <div style={{ color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>
              Error: {errorMsg}
            </div>
          )}

          {/* Show segments as they stream in, even while still loading */}
          {segments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: status === 'loading' ? 12 : 0 }}>
              {segments.map((seg, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: '#4b5563', fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingTop: 2 }}>
                    {formatTime(seg.start)}
                  </span>
                  <span style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.5 }}>
                    {seg.text.trim()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom strip */}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {/* Drag handle */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -4px)', width: 40, height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />

        {/* Upload button */}
        <button
          onClick={openPicker}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: status === 'loading' ? '#374151' : '#3b82f6',
            border: 'none', cursor: status === 'loading' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {status === 'loading' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
        </button>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            ATC Recording
          </p>
          <p style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status === 'loading' ? (progress || 'Processing…') : (fileName ?? 'Upload an MP3 to transcribe')}
          </p>
        </div>

        {status === 'done' && (
          <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
            DONE
          </span>
        )}

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
    </div>
  )
}
