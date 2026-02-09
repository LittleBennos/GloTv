const pdfjsLib = await import('../../node_modules/pdfjs-dist/build/pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs';

const canvasA = document.getElementById('slideA');
const canvasB = document.getElementById('slideB');
const status = document.getElementById('status');

let config = { slideDuration: 10000, transitionDuration: 1000, schedule: null };
let slides = []; // { pdfPath, pageNum, doc, duration }
let currentIndex = -1;
let activeCanvas = canvasA;
let timer = null;
let loadedDocs = new Map();

function isWithinSchedule() {
  if (!config.schedule) return true;
  const { startHour, endHour } = config.schedule;
  if (startHour == null || endHour == null) return true;
  const hour = new Date().getHours();
  return hour >= startHour && hour < endHour;
}

async function init() {
  config = await window.glotv.getConfig();

  canvasA.style.transition = `opacity ${config.transitionDuration}ms ease-in-out`;
  canvasB.style.transition = `opacity ${config.transitionDuration}ms ease-in-out`;

  const pdfs = await window.glotv.getPdfs();
  await loadPdfs(pdfs);

  window.glotv.onSlidesUpdated(async (pdfs, durations) => {
    await loadPdfs(pdfs, durations);
  });

  // Check schedule every minute
  setInterval(() => {
    if (!isWithinSchedule()) {
      canvasA.className = 'hidden';
      canvasB.className = 'hidden';
      status.style.display = 'block';
      status.textContent = 'Outside display hours';
      stopTimer();
    } else if (slides.length > 0 && timer === null) {
      status.style.display = 'none';
      currentIndex = 0;
      showSlide(0);
      startTimer();
    }
  }, 60000);
}

async function loadPdfs(pdfPaths, durations) {
  for (const [path, doc] of loadedDocs) {
    if (!pdfPaths.includes(path)) {
      doc.destroy();
      loadedDocs.delete(path);
    }
  }

  slides = [];

  for (let i = 0; i < pdfPaths.length; i++) {
    const pdfPath = pdfPaths[i];
    const fileDuration = durations ? durations[i] : null;
    try {
      let doc = loadedDocs.get(pdfPath);
      if (!doc) {
        const url = 'glotv:///' + encodeURIComponent(pdfPath);
        doc = await pdfjsLib.getDocument(url).promise;
        loadedDocs.set(pdfPath, doc);
      }

      for (let p = 1; p <= doc.numPages; p++) {
        slides.push({ pdfPath, pageNum: p, doc, duration: fileDuration });
      }
    } catch (err) {
      console.error(`Error loading PDF ${pdfPath}:`, err);
    }
  }

  console.log(`Loaded ${slides.length} slides from ${pdfPaths.length} PDFs`);

  if (slides.length > 0 && isWithinSchedule()) {
    status.style.display = 'none';
    if (currentIndex < 0) {
      currentIndex = 0;
      await showSlide(0);
      startTimer();
    }
  } else if (slides.length === 0) {
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
  nextCanvas.className = 'active';
  activeCanvas.className = 'hidden';
  activeCanvas = nextCanvas;
  currentIndex = index;
}

function startTimer() {
  stopTimer();
  async function advance() {
    if (slides.length === 0 || !isWithinSchedule()) return;
    const next = (currentIndex + 1) % slides.length;
    await showSlide(next);
    // Use per-slide duration or global
    const dur = slides[next].duration || config.slideDuration;
    timer = setTimeout(advance, dur);
  }
  const dur = slides.length > 0 && slides[currentIndex]
    ? (slides[currentIndex].duration || config.slideDuration)
    : config.slideDuration;
  timer = setTimeout(advance, dur);
}

function stopTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

init();
