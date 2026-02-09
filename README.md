# GloTv

Lightweight digital signage system for offices. Drop PowerPoint files on a shared network drive, manage them with the **Server** app, and display them full-screen with the **Client** app.

## Architecture

```
Shared Network Drive (\\server\GloTV\)
  ├── config.json          ← written by Server, read by Clients
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

- Configure which PPTX files to show, their order, duration, and schedule
- Writes `config.json` to the shared drive folder
- Run on one admin machine

## Client (Display App)

```powershell
cd client
npm install
npm start
```

- Reads PPTX files + `config.json` from the shared drive
- Converts slides to PDF via LibreOffice, renders full-screen via PDF.js
- Polls for changes and updates automatically
- Press **ESC** to exit

## Config Format

The `config.json` on the shared drive (managed by Server) looks like:

```json
{
  "version": 1,
  "globalSlideDuration": 10000,
  "schedule": {
    "enabled": false,
    "startTime": "08:00",
    "endTime": "18:00",
    "days": ["Mon","Tue","Wed","Thu","Fri"]
  },
  "files": [
    {
      "filename": "Welcome.pptx",
      "active": true,
      "slideDuration": null,
      "order": 0
    }
  ]
}
```
