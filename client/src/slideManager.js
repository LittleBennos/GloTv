const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SlideManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.cacheDir = path.join(__dirname, '..', 'cache');
    this.knownFiles = new Map();
    this.pdfPaths = [];
    this.pollTimer = null;

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  getPdfs() {
    return this.pdfPaths;
  }

  async start() {
    await this.scan();
    this.pollTimer = setInterval(() => this.scan(), this.config.pollInterval);
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadGloTvConfig() {
    const configPath = path.join(this.config.slidesFolder, 'glotv-config.json');
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (err) {
      console.error('Error reading glotv-config.json:', err.message);
    }
    return null;
  }

  async scan() {
    const folder = this.config.slidesFolder;
    if (!fs.existsSync(folder)) {
      console.log(`Slides folder not found: ${folder}`);
      return;
    }

    const glotvConfig = this.loadGloTvConfig();

    let pptxFiles;
    try {
      pptxFiles = fs.readdirSync(folder)
        .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'))
        .sort();
    } catch (err) {
      console.error('Error reading slides folder:', err.message);
      return;
    }

    // Filter by active status from config
    if (glotvConfig && glotvConfig.files) {
      const configFiles = new Map(glotvConfig.files.map(f => [f.name.toLowerCase(), f]));
      pptxFiles = pptxFiles.filter(f => {
        const entry = configFiles.get(f.toLowerCase());
        // If file is in config, respect active flag; if not in config, include it
        return !entry || entry.active !== false;
      });

      // Sort by order from config
      pptxFiles.sort((a, b) => {
        const entryA = configFiles.get(a.toLowerCase());
        const entryB = configFiles.get(b.toLowerCase());
        const orderA = entryA ? (entryA.order ?? 999) : 999;
        const orderB = entryB ? (entryB.order ?? 999) : 999;
        return orderA - orderB;
      });
    }

    const currentFiles = new Map();
    let changed = false;

    for (const file of pptxFiles) {
      const fullPath = path.join(folder, file);
      try {
        const stat = fs.statSync(fullPath);
        const mtime = stat.mtimeMs;
        currentFiles.set(file, mtime);

        if (!this.knownFiles.has(file) || this.knownFiles.get(file) !== mtime) {
          changed = true;
          this.convertToPdf(fullPath, file);
        }
      } catch (err) {
        console.error(`Error stat ${file}:`, err.message);
      }
    }

    for (const [file] of this.knownFiles) {
      if (!currentFiles.has(file)) {
        changed = true;
        const baseName = path.parse(file).name;
        const pdfPath = path.join(this.cacheDir, baseName + '.pdf');
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      }
    }

    this.knownFiles = currentFiles;

    if (changed) {
      this.rebuildList(pptxFiles, glotvConfig);
    }
  }

  convertToPdf(fullPath, filename) {
    const soffice = this.config.libreOfficePath;
    console.log(`Converting: ${filename}`);
    try {
      execSync(
        `"${soffice}" --headless --convert-to pdf --outdir "${this.cacheDir}" "${fullPath}"`,
        { timeout: 120000, windowsHide: true }
      );
      console.log(`  → PDF created for ${filename}`);
    } catch (err) {
      console.error(`Conversion error for ${filename}:`, err.message);
    }
  }

  rebuildList(orderedPptx, glotvConfig) {
    // Build PDF list in the same order as the ordered PPTX files
    const pdfs = [];
    const durations = [];

    if (orderedPptx) {
      const configFiles = glotvConfig && glotvConfig.files
        ? new Map(glotvConfig.files.map(f => [f.name.toLowerCase(), f]))
        : new Map();

      for (const file of orderedPptx) {
        const baseName = path.parse(file).name;
        const pdfPath = path.join(this.cacheDir, baseName + '.pdf');
        if (fs.existsSync(pdfPath)) {
          const entry = configFiles.get(file.toLowerCase());
          const duration = entry && entry.duration != null ? entry.duration * 1000 : null;
          pdfs.push(pdfPath);
          durations.push(duration);
        }
      }
    } else {
      // Fallback: just list PDFs alphabetically
      const files = fs.readdirSync(this.cacheDir)
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .sort();
      for (const f of files) {
        pdfs.push(path.join(this.cacheDir, f));
        durations.push(null);
      }
    }

    console.log(`Total PDFs: ${pdfs.length}`);
    this.pdfPaths = pdfs;
    this.pdfDurations = durations;
    this.emit('slides-updated', pdfs, durations);
  }
}

module.exports = { SlideManager };
