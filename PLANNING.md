# FlightRadarATC — Project Planning Document

## Overview

**FlightRadarATC** is a personal iPhone PWA that replicates the core experience of the ATC Live Air Traffic Radio app (App Store id6755132266) for free. The two core features are:

1. Live aircraft positions on a map (ADS-B data via OpenSky Network)
2. Live ATC audio streaming (LiveATC.net public streams)

This is a personal project — no App Store, no backend server, no subscription. It lives on your iPhone home screen as a Progressive Web App deployed to GitHub Pages.

**GitHub repo:** `flight-radar-atc`  
**Primary airport:** KBOS — Boston Logan International  
**Stack:** React + Vite, Tailwind CSS, Mapbox GL JS, GitHub Pages  

---

## App Structure — Two Modes

The app has two distinct top-level experiences:

### Airport Mode
The default experience. Focused on a single airport (KBOS). Shows all aircraft in the local airspace on a map, plays a selected ATC frequency, and in Phase 3 automatically highlights the aircraft currently talking.

### Flight Mode *(Phase 4)*
Follow a specific flight from gate to gate. Two sub-experiences sharing the same map and transcript components but with different layout priorities:

- **On the plane** — immersive lean-back UI. Full screen route map with your position, live transcript scrolling up like a chat feed, altitude and speed displayed prominently. Minimal interaction needed — open and watch.
- **From the ground** — lean-forward flight tracker. Flight status and ETA are the hero elements, audio and transcript are secondary. More like a flight tracker with ATC audio layered on.

---

## Phases

### Phase 1 — Core App
*Free · ~1–2 sessions · Usable on iPhone*

The foundation. Gets a working, installable app on your phone doing the two core things.

**Features:**
- React PWA shell installable to iPhone home screen via Safari "Add to Home Screen"
- Mapbox GL JS map centered on KBOS (42.36°N, 71.00°W)
- Live aircraft positions via OpenSky Network API, polled every 10 seconds
- Aircraft rendered as rotating arrow icons (heading-aware)
- LiveATC.net audio stream player
- Expandable bottom drawer UI for audio controls (see UI Design section)
- Four KBOS frequency feeds: Boston Approach (119.2), Logan Tower (128.8), Ground Control (121.9), Boston Departure (135.9)
- GitHub Pages deployment

**File structure:**
```
flight-radar-atc/
├── public/
│   ├── manifest.json        ← PWA manifest
│   ├── sw.js                ← service worker
│   └── icons/               ← app icons (various sizes for iOS)
├── src/
│   ├── App.jsx              ← root component, layout shell
│   ├── components/
│   │   ├── Map.jsx          ← Mapbox map
│   │   ├── AudioPlayer.jsx  ← ATC audio + frequency picker
│   │   └── TopBar.jsx       ← app header
│   ├── hooks/
│   │   └── useAircraft.js   ← OpenSky polling logic
│   └── main.jsx
├── index.html
├── vite.config.js
└── PLANNING.md
```

---

### Phase 2 — Smarter Map
*Free · Polished experience · Better interactivity*

Makes the map genuinely useful and enjoyable.

**Features:**

**Tap to follow** — tap any aircraft to lock the camera onto it. The map smoothly pans with the aircraft on each position update using `map.easeTo()`. A highlight state (color change + pulse) indicates the followed aircraft. The bottom drawer updates to show that flight's info. Tap anywhere else to release the follow lock.

**Flight labels** — callsign labels on aircraft icons, zoom-dependent:
- Low zoom: no labels, icons only
- Medium zoom: callsign only (e.g. "DAL472")
- High zoom: small card with callsign, altitude, speed
- Followed aircraft always shows full label regardless of zoom
- Mapbox's built-in label collision system handles density automatically

**Airport overlay** — KBOS runway and taxiway diagram layered over the map at high zoom levels. Data sourced from OpenStreetMap aeronautical data, stored as a local GeoJSON file. Shows runways, taxiway centerlines, apron areas. Only visible above a zoom threshold so it doesn't clutter the wider view. Allows you to watch aircraft taxi across the actual airport diagram.

---

### Phase 3 — AI Auto-Highlight
*Low cost · Whisper API · The magic feature*

The feature that makes the app feel like the paid ATC app — the map automatically highlights and pans to the aircraft currently talking on the ATC frequency.

**How it works:**
1. Pipe the LiveATC audio stream through OpenAI Whisper API in real time
2. Parse the transcript for ATC callsigns using regex or a small LLM prompt (ATC always addresses aircraft by callsign, e.g. "Delta 472, turn left heading 090")
3. Cross-reference the extracted callsign against the live OpenSky feed
4. Pan and highlight that aircraft on the map

**Cost:** ~$0.006/minute via Whisper API. At an hour of listening per day that's roughly $0.36/day — essentially free for personal use.

**Alternative:** Whisper can also run locally (whisper.cpp) for completely free transcription if you want zero API cost. Requires a bit more setup.

---

### Phase 4 — Flight Mode
*Gate to gate · Live transcript · Auto frequency switching*

Follow any flight from departure to arrival, listening to the pilots talk to ATC throughout.

**Features:**
- **Flight search** — enter any flight number (e.g. AA1234) to begin tracking
- **Route display** — full route map from origin to destination with live position
- **Auto frequency switching** — as the aircraft is handed off between ATC facilities (Departure → Center → Approach → Tower), the audio stream switches automatically
- **Gate to gate transcript** — full running log of all ATC communications for the flight, timestamped
- **Two UI modes** — on the plane (lean-back, transcript hero) and from the ground (flight status hero)

**Note on en-route coverage:** LiveATC coverage is excellent for approach and departure phases. En-route ARTCC center frequencies have thinner coverage on LiveATC, so there may be gaps during cruise. The experience is richest during departure and arrival — which is also when the most interesting communications happen.

**Additional API needed:** OpenSky doesn't provide origin/destination data. For flight route information, AviationStack (free tier) can look up a callsign and return the full route.

---

## UI Design

### Overall Layout
- Full screen Mapbox map as the main canvas
- Dark mode as the default aesthetic (suits aviation, easy on eyes at night)
- Top bar: airport code (KBOS) + live status indicator (green dot)
- Bottom: expandable audio drawer

### Expandable Audio Drawer

**Collapsed state** (default):
- Thin strip at the bottom of the screen
- Shows: "now playing" label, current frequency name, MHz badge, play/pause button
- Live audio waveform visualization
- Swipe up on handle to expand

**Expanded state:**
- Slides up to reveal the full frequency list
- Map shrinks but stays visible for spatial context
- Active frequency highlighted in green
- Frequency list items: name, MHz, LIVE badge on active
- Tap a frequency row to instantly switch the stream

**KBOS Frequencies:**
| Name | MHz |
|------|-----|
| Boston Approach | 119.2 |
| Logan Tower | 128.8 |
| Ground Control | 121.9 |
| Boston Departure | 135.9 |

### iPhone-Specific Considerations
- **Safe area insets** — use `env(safe-area-inset-bottom)` so the drawer doesn't sit behind the home indicator on notched iPhones
- **Standalone mode detection** — `window.navigator.standalone` to detect if installed vs visiting in Safari
- **Background audio** — iOS PWAs have a quirk where audio pauses when the screen locks. Needs a specific workaround (keep a silent audio context alive)
- **Icons** — Apple requires specific icon sizes in manifest.json for proper home screen appearance

---

## Data Sources

### OpenSky Network API
- **URL:** `https://opensky-network.org/api/states/all`
- **Auth:** Free account, basic auth (username + password)
- **Rate limit:** 1 request/10 seconds (authenticated), 1/15 seconds (anonymous)
- **Bounding box for KBOS:** `lamin=41.8&lomin=-71.9&lamax=42.9&lomax=-70.1`
- **Poll interval:** Every 10 seconds

**Response format** — `states` is an array of arrays (not objects). Key positions:
```
[0]  icao24         unique aircraft hex ID
[1]  callsign       trim trailing spaces
[5]  longitude      decimal degrees
[6]  latitude       decimal degrees
[7]  baro_altitude  meters → multiply by 3.281 for feet
[8]  on_ground      boolean
[9]  velocity       m/s → multiply by 1.944 for knots
[10] true_track     heading in degrees (0 = north)
```

**Parse helper:**
```javascript
const parseAircraft = (state) => ({
  icao24:    state[0],
  callsign:  state[1]?.trim() || 'Unknown',
  longitude: state[5],
  latitude:  state[6],
  altitude:  Math.round(state[7] * 3.281),
  onGround:  state[8],
  speed:     Math.round(state[9] * 1.944),
  heading:   state[10],
})
```

**Gotchas:**
- Filter out entries where `state[5]` or `state[6]` is null (no position fix)
- Aircraft with `on_ground: true` should render differently — smaller icon, different color, only visible at high zoom
- Handle API failures silently — keep showing last known positions rather than crashing

### LiveATC.net
- Public MP3 audio streams, no API key needed
- KBOS streams are reliable and well-covered
- Just point an HTML `<audio>` element at the stream URL
- Stream URLs subject to change — worth checking LiveATC.net if a stream goes dead

### AviationStack *(Phase 4)*
- Free tier available
- Used to look up flight route (origin, destination, waypoints) by callsign
- Supplements OpenSky which has no route data

---

## Tech Stack

| Tool | Purpose | Cost |
|------|---------|------|
| React + Vite | Frontend framework | Free |
| Tailwind CSS | Styling | Free |
| Mapbox GL JS | Map rendering | Free tier (50k loads/mo) |
| OpenSky Network API | Live ADS-B aircraft data | Free |
| LiveATC.net | ATC audio streams | Free |
| GitHub Pages | Hosting + deployment | Free |
| OpenAI Whisper API | Real-time transcription (Phase 3+) | ~$0.006/min |
| AviationStack | Flight route data (Phase 4) | Free tier |

---

## Local Environment

**Requirements:**
- Node 18+ (currently using 24.7.0 ✓)
- npm 9+ (currently using 11.5.1 ✓)
- Git configured with name and email
- VS Code

**Accounts needed before starting:**
- GitHub account + repo `flight-radar-atc`
- Mapbox account → public token (starts with `pk.eyJ1...`)
- OpenSky account → username + password

**Scaffold command:**
```bash
npm create vite@latest flight-radar-atc -- --template react
cd flight-radar-atc
npm install
npm install mapbox-gl
npm install -D tailwindcss @tailwindcss/vite
code .
```

---

## How to Use This Document in Claude Code

At the start of any Claude Code session, say:

> "Please read PLANNING.md before we start — it has the full project context."

This gives Claude Code complete context on the architecture, design decisions, data sources, and where we are in the build without needing to re-explain anything.
