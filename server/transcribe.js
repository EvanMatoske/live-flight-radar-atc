import express    from 'express'
import multer     from 'multer'
import cors       from 'cors'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs         from 'fs/promises'
import path       from 'path'
import os         from 'os'
import { createReadStream } from 'fs'
import FormData   from 'form-data'
import fetch      from 'node-fetch'

const execFileAsync = promisify(execFile)

const AZURE_ENDPOINT = process.env.VITE_AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '')
const AZURE_KEY      = process.env.VITE_AZURE_OPENAI_KEY
const DEPLOYMENT     = process.env.VITE_AZURE_OPENAI_WHISPER_DEPLOYMENT ?? 'whisper'
const API_VERSION    = '2024-06-01'
const CHUNK_SEC      = 30
const ATC_PROMPT     = 'Boston Logan tower, KBOS. Runway 22L, 33L, 27. Cleared to land, contact departure, squawk, heading, descend, maintain, altimeter.'

const app    = express()
const upload = multer({ dest: os.tmpdir() })

app.use(cors({ origin: /localhost/ }))

// Transcribe a single WAV file via Azure Whisper, retrying on 429 rate limit
async function whisperChunk(filePath, startTime) {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT}/audio/transcriptions?api-version=${API_VERSION}`

  while (true) {
    const form = new FormData()
    form.append('file',            createReadStream(filePath), { filename: 'chunk.wav', contentType: 'audio/wav' })
    form.append('response_format', 'verbose_json')
    form.append('language',        'en')
    form.append('temperature',     '0.2')
    form.append('prompt',          ATC_PROMPT)

    const res = await fetch(url, { method: 'POST', headers: { 'api-key': AZURE_KEY, ...form.getHeaders() }, body: form })

    if (res.status === 429) {
      const body    = await res.text()
      const match   = body.match(/retry after (\d+) seconds/i)
      const waitSec = match ? parseInt(match[1]) + 2 : 60
      console.log(`[transcribe] rate limited — waiting ${waitSec}s before retry`)
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      continue  // retry
    }

    if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`)

    const data = await res.json()
    return (data.segments ?? []).map((seg) => ({
      start: parseFloat((seg.start + startTime).toFixed(2)),
      end:   parseFloat((seg.end   + startTime).toFixed(2)),
      text:  seg.text.trim(),
    }))
  }
}

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path
  if (!inputPath) return res.status(400).json({ error: 'No file uploaded' })

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atc-'))

  try {
    // 1. Use ffmpeg to split into CHUNK_SEC-second mono 16kHz WAV chunks
    //    with volume normalization and silence removal to reduce hallucinations
    const chunkPattern = path.join(workDir, 'chunk_%03d.wav')
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-ac', '1',           // mono
      '-ar', '16000',       // 16 kHz — Whisper's native rate
      '-af', [
        'highpass=f=100',           // remove low-frequency hum/noise
        'volume=2',                 // simple 2x boost — no phase artifacts
        'silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-35dB', // strip static gaps
      ].join(','),
      '-f', 'segment',
      '-segment_time', String(CHUNK_SEC),
      '-reset_timestamps', '1',
      chunkPattern,
    ])

    // 2. Collect chunk files in order
    const files = (await fs.readdir(workDir))
      .filter((f) => f.startsWith('chunk_') && f.endsWith('.wav'))
      .sort()

    console.log(`[transcribe] ${req.file.originalname} → ${files.length} chunks`)

    // 3. Transcribe each chunk and stream segments back as newline-delimited JSON
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Transfer-Encoding', 'chunked')

    for (let i = 0; i < files.length; i++) {
      const chunkPath = path.join(workDir, files[i])
      const startTime = i * CHUNK_SEC
      console.log(`[transcribe] chunk ${i + 1}/${files.length} (t=${startTime}s)`)

      try {
        const segs = await whisperChunk(chunkPath, startTime)
        for (const seg of segs) {
          res.write(JSON.stringify(seg) + '\n')
        }
      } catch (err) {
        console.error(`[transcribe] chunk ${i + 1} failed:`, err.message)
      }
    }

    res.end()
  } finally {
    // Clean up temp files
    await fs.rm(workDir,   { recursive: true, force: true })
    await fs.rm(inputPath, { force: true })
  }
})

const PORT = 3002
app.listen(PORT, () => console.log(`[transcribe] server listening on http://localhost:${PORT}`))
