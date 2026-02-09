# GloTv

Lightweight Electron digital signage app for offices. Drop PowerPoint files in a shared folder and GloTv displays them full-screen on a loop.

## How it Works

1. Points at a folder containing `.pptx` files
2. Converts each to PDF via LibreOffice headless
3. Renders each slide full-screen using PDF.js
4. Polls the folder for changes and auto-updates

## Prerequisites

- **Node.js** 18+
- **LibreOffice** — install from https://www.libreoffice.org/download/
  - Default install path: `C:\Program Files\LibreOffice\program\soffice.exe`

## Setup

```powershell
cd C:\Projects\GloTv
npm install
```

## Configuration

Edit `config.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `slidesFolder` | `C:\GloTV` | Path to folder with .pptx files |
| `slideDuration` | `10000` | Time per slide in ms |
| `pollInterval` | `15000` | How often to check for file changes (ms) |
| `transitionDuration` | `1000` | Crossfade duration in ms |
| `libreOfficePath` | `C:\Program Files\LibreOffice\program\soffice.exe` | Path to LibreOffice |

For network drives, use UNC paths: `\\\\server\\GloTV\\`

## Run

```powershell
npm start
```

Starts full-screen in kiosk mode. Press **ESC** to exit.

### Dev mode (windowed + DevTools)

```powershell
npm run dev
```

## How it Works

- PPTX files are converted to PDF by LibreOffice headless
- PDFs are cached in the `cache/` folder
- PDF.js renders each page as a slide in the Electron window
- Folder is polled every 15s (configurable) for changes
- Modified/new/removed files trigger automatic re-conversion
