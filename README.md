# GloTv

Lightweight digital signage system for offices. Drop PowerPoint files on a shared network drive, manage them with the **Server** app, and display them full-screen with the **Client** app.

## Architecture

```
Shared Network Drive (e.g. \\server\GloTV\)
  ├── glotv-config.json    ← written by Server, read by Clients
  ├── Presentation1.pptx
  ├── Presentation2.pptx
  └── ...
```

- **Server** — Admin app that manages the slideshow (one machine)
- **Client** — Display app that shows slides full-screen (multiple machines/TVs)
- **No networking** — the shared folder is the only communication layer

## Prerequisites

- **Node.js** 18+
- **LibreOffice** — https://www.libreoffice.org/download/ (used by Client for PPTX→PDF conversion)

## Server (Admin App)

```powershell
cd server
npm install
npm start
```

- Configure the shared drive folder path
- See all PPTX files found in that folder
- Toggle files active/inactive
- Set slide order (up/down buttons)
- Set global slide duration + per-file override
- Set display schedule (start/end hours)
- Writes `glotv-config.json` to the shared drive folder

## Client (Display App)

```powershell
cd client
npm install
npm start
```

- Reads PPTX files + `glotv-config.json` from the shared drive
- Converts slides to PDF via LibreOffice, renders full-screen via PDF.js
- Respects file order, active/inactive toggles, duration overrides, and schedule
- Falls back to showing all files with default duration if no config found
- Polls for changes and updates automatically
- Press **ESC** to exit

Configure `client/config.json` with:
- `slidesFolder` — path to the shared drive folder
- `libreOfficePath` — path to LibreOffice executable
- `slideDuration` — default slide duration in ms (fallback if no server config)
- `pollInterval` — how often to check for changes (ms)

## Config Format (`glotv-config.json`)

Written by the Server app to the shared drive folder:

```json
{
  "slideDuration": 10,
  "schedule": { "startHour": 7, "endHour": 19 },
  "transition": "crossfade",
  "files": [
    { "name": "welcome.pptx", "active": true, "duration": 15, "order": 0 },
    { "name": "safety.pptx", "active": true, "duration": null, "order": 1 },
    { "name": "old-notice.pptx", "active": false, "duration": null, "order": 2 }
  ]
}
```
