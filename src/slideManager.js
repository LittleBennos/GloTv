const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SlideManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.cacheDir = path.join(__dirname, '..', 'cache');
    this.knownFiles = new Map(); // filename -> mtime
    this.pdfPaths = []; // ordered list of PDF paths
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

  async scan() {
    const folder = this.config.slidesFolder;
    if (!fs.existsSync(folder)) {
      console.log(`Slides folder not found: ${folder}`);
      return;
    }

    let pptxFiles;
    try {
      pptxFiles = fs.readdirSync(folder)
        .filter(f => f.toLowerCase().endsWith('.pptx') && !f.startsWith('~$'))
        .sort();
    } catch (err) {
      console.error('Error reading slides folder:', err.message);
      return;
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

    // Check for removed files
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
      this.rebuildList();
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

  rebuildList() {
    const pdfs = fs.readdirSync(this.cacheDir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort()
      .map(f => path.join(this.cacheDir, f));

    console.log(`Total PDFs: ${pdfs.length}`);
    this.pdfPaths = pdfs;
    this.emit('slides-updated', pdfs);
  }
}

module.exports = { SlideManager };
