let config = null;
const allDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

async function init() {
  const folder = await window.glotv.getSharedFolder();
  document.getElementById('folderPath').textContent = folder;

  config = await window.glotv.getConfig();
  renderConfig();

  document.getElementById('btnPickFolder').onclick = async () => {
    const f = await window.glotv.pickFolder();
    if (f) {
      document.getElementById('folderPath').textContent = f;
      config = await window.glotv.getConfig();
      await refreshFiles();
      renderConfig();
    }
  };

  document.getElementById('btnRefresh').onclick = refreshFiles;
  document.getElementById('btnSave').onclick = saveConfig;
}

function renderConfig() {
  document.getElementById('globalDuration').value = (config.globalSlideDuration || 10000) / 1000;
  document.getElementById('scheduleEnabled').checked = config.schedule?.enabled || false;
  document.getElementById('scheduleStart').value = config.schedule?.startTime || '08:00';
  document.getElementById('scheduleEnd').value = config.schedule?.endTime || '18:00';

  // Days
  const dc = document.getElementById('daysContainer');
  dc.innerHTML = '';
  const activeDays = config.schedule?.days || ['Mon','Tue','Wed','Thu','Fri'];
  for (const day of allDays) {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (activeDays.includes(day) ? ' on' : '');
    btn.textContent = day;
    btn.onclick = () => { btn.classList.toggle('on'); };
    dc.appendChild(btn);
  }

  renderFiles();
}

function renderFiles() {
  const list = document.getElementById('fileList');
  const noFiles = document.getElementById('noFiles');
  list.innerHTML = '';

  if (!config.files || config.files.length === 0) {
    noFiles.style.display = 'block';
    return;
  }
  noFiles.style.display = 'none';

  config.files.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <span class="controls">
        <button class="move-btn" data-dir="up" data-idx="${index}">▲</button>
        <button class="move-btn" data-dir="down" data-idx="${index}">▼</button>
      </span>
      <span class="name">${file.filename}</span>
      <span class="controls">
        <label style="font-size:11px;color:#aaa;">Duration (s):</label>
        <input type="number" min="1" max="300" value="${file.slideDuration ? file.slideDuration / 1000 : ''}"
               placeholder="global" data-idx="${index}" class="file-duration">
        <div class="toggle ${file.active !== false ? 'on' : ''}" data-idx="${index}"></div>
      </span>
    `;
    list.appendChild(li);
  });

  // Event delegation
  list.querySelectorAll('.move-btn').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.idx);
      const dir = btn.dataset.dir;
      if (dir === 'up' && i > 0) swap(i, i - 1);
      else if (dir === 'down' && i < config.files.length - 1) swap(i, i + 1);
      reorder();
      renderFiles();
    };
  });

  list.querySelectorAll('.toggle').forEach(t => {
    t.onclick = () => {
      const i = parseInt(t.dataset.idx);
      config.files[i].active = !config.files[i].active;
      t.classList.toggle('on');
    };
  });

  list.querySelectorAll('.file-duration').forEach(inp => {
    inp.onchange = () => {
      const i = parseInt(inp.dataset.idx);
      const v = parseInt(inp.value);
      config.files[i].slideDuration = v > 0 ? v * 1000 : null;
    };
  });
}

function swap(a, b) {
  [config.files[a], config.files[b]] = [config.files[b], config.files[a]];
}

function reorder() {
  config.files.forEach((f, i) => f.order = i);
}

async function refreshFiles() {
  const diskFiles = await window.glotv.scanFiles();
  const existing = new Map((config.files || []).map(f => [f.filename, f]));

  // Add new files not yet in config
  for (const name of diskFiles) {
    if (!existing.has(name)) {
      config.files.push({ filename: name, active: true, slideDuration: null, order: config.files.length });
    }
  }

  // Remove files no longer on disk
  const diskSet = new Set(diskFiles);
  config.files = config.files.filter(f => diskSet.has(f.filename));
  reorder();
  renderFiles();
}

function gatherConfig() {
  config.version = 1;
  config.globalSlideDuration = parseInt(document.getElementById('globalDuration').value) * 1000 || 10000;
  config.schedule = {
    enabled: document.getElementById('scheduleEnabled').checked,
    startTime: document.getElementById('scheduleStart').value,
    endTime: document.getElementById('scheduleEnd').value,
    days: Array.from(document.querySelectorAll('.day-btn.on')).map(b => b.textContent),
  };
  return config;
}

async function saveConfig() {
  const c = gatherConfig();
  await window.glotv.saveConfig(c);
  document.getElementById('saveStatus').textContent = '✓ Saved';
  setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 3000);
}

init();
