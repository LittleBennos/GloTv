// PDF.js setup
const pdfjsLib = await import('../../node_modules/pdfjs-dist/build/pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs';

const canvasA = document.getElementById('slideA');
const canvasB = document.getElementById('slideB');
const status = document.getElementById('status');

let config = { slideDuration: 10000, transitionDuration: 1000 };
let slides = []; // { pdfPath, pageNum, doc }
let currentIndex = -1;
let activeCanvas = canvasA;
let timer = null;
let loadedDocs = new Map(); // pdfPath -> PDFDocumentProxy

async function init() {
  config = await window.glotv.getConfig();

  // Set transition duration from config
  canvasA.style.transition = `opacity ${config.transitionDuration}ms ease-in-out`;
  canvasB.style.transition = `opacity ${config.transitionDuration}ms ease-in-out`;

  const pdfs = await window.glotv.getPdfs();
  await loadPdfs(pdfs);

  window.glotv.onSlidesUpdated(async (pdfs) => {
    await loadPdfs(pdfs);
  });
}

async function loadPdfs(pdfPaths) {
  // Close old docs
  for (const [path, doc] of loadedDocs) {
    if (!pdfPaths.includes(path)) {
      doc.destroy();
      loadedDocs.delete(path);
    }
  }

  slides = [];

  for (const pdfPath of pdfPaths) {
    try {
      let doc = loadedDocs.get(pdfPath);
      if (!doc) {
        // Load via file protocol
        const url = 'glotv:///' + encodeURIComponent(pdfPath);
        doc = await pdfjsLib.getDocument(url).promise;
        loadedDocs.set(pdfPath, doc);
      }

      for (let i = 1; i <= doc.numPages; i++) {
        slides.push({ pdfPath, pageNum: i, doc });
      }
    } catch (err) {
      console.error(`Error loading PDF ${pdfPath}:`, err);
    }
  }

  console.log(`Loaded ${slides.length} slides from ${pdfPaths.length} PDFs`);

  if (slides.length > 0) {
    status.style.display = 'none';
    if (currentIndex < 0) {
      currentIndex = 0;
      await showSlide(0);
      startTimer();
    }
  } else {
    status.style.display = 'block';
    status.textContent = 'Waiting for slides...';
    stopTimer();
    canvasA.className = 'hidden';
    canvasB.className = 'hidden';
    currentIndex = -1;
  }
}

async function renderPage(slide, canvas) {
  const page = await slide.doc.getPage(slide.pageNum);

  // Scale to fill screen while maintaining aspect ratio
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const viewport = page.getViewport({ scale: 1 });

  const scale = Math.min(screenW / viewport.width, screenH / viewport.height);
  const scaledViewport = page.getViewport({ scale });

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
}

async function showSlide(index) {
  if (slides.length === 0) return;

  const nextCanvas = activeCanvas === canvasA ? canvasB : canvasA;

  await renderPage(slides[index], nextCanvas);

  // Crossfade
  nextCanvas.className = 'active';
  activeCanvas.className = 'hidden';
  activeCanvas = nextCanvas;
  currentIndex = index;
}

function startTimer() {
  stopTimer();
  timer = setInterval(async () => {
    if (slides.length === 0) return;
    const next = (currentIndex + 1) % slides.length;
    await showSlide(next);
  }, config.slideDuration);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

init();
