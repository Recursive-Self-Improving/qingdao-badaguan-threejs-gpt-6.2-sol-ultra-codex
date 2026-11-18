import './style.css';

const paths = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15"/>',
  pin: '<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  mute: '<path d="M3 9h4l5-4v14l-5-4H3zm13 1 5 5m0-5-5 5"/>',
  sound: '<path d="M3 9h4l5-4v14l-5-4H3zm12-1a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shrink: '<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 1 1 4 2.5c-.8.4-1.2 1-1.2 1.8m0 3.3h.01"/>',
  footsteps: '<path d="M7.2 3.4c1.8-.5 3.2 1.2 3 3.5-.1 1.9-1 3.2-2.4 3.6-1.9.6-3.1-.7-3.1-2.7 0-2.1.8-3.9 2.5-4.4zm-.4 9.4c1.2-.1 2 .4 2.1 1.3.1 1-.6 1.9-1.5 2-1.1.2-2.2-.4-2.3-1.3-.1-.8.4-1.8 1.7-2zm10.1-3.1c-1.8-.5-3.2 1.2-3 3.5.1 1.9 1 3.2 2.4 3.6 1.9.6 3.1-.7 3.1-2.7 0-2.1-.8-3.9-2.5-4.4zm.4 9.4c-1.2-.1-2 .4-2.1 1.3-.1 1 .6 1.9 1.5 2 1.1.2 2.2-.4 2.3-1.3.1-.8-.4-1.8-1.7-2z"/>',
  arrow: '<path d="M4 12h15m-6-5 5 5-5 5"/>',
  'arrow-up': '<path d="m6 18 12-12m-8 0h8v8"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  needle: '<path d="m12 3 5 18-5-4-5 4z"/><path d="M12 3v14L7 21z" fill="currentColor"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 6v4"/>',
  sunset: '<path d="M3 17h18M5 21h14M7 17a5 5 0 1 1 10 0m-5-10V4m6 6 2-2M6 10 4 8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M20 15.2A8.2 8.2 0 0 1 8.8 4 8.4 8.4 0 1 0 20 15.2Z"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

const places = {
  huashi: {
    name: '花石樓', area: '山海關路 · 海濱別墅',
    copy: '花崗岩與卵石砌成外牆，圓塔上的雉堞與尖拱窗勾勒出花石樓的輪廓。沿著樓旁的小路走，可以眺望太平灣。',
    mapX: 25, mapZ: 1, x: 14.6, z: -11.4, lookX: 24.5, lookZ: 1.8, pitch: 0.15,
  },
  princess: {
    name: '公主樓', area: '居庸關路 · 北歐風別墅',
    copy: '居庸關路上的公主樓有淡綠色外牆、尖塔和不對稱的斜屋頂。秋天走過這條街，銀杏葉逐漸轉黃。',
    mapX: -27.5, mapZ: -54.5, x: -22, z: -37.5, lookX: -27.8, lookZ: -54, pitch: 0.13,
  },
  beach: {
    name: '第二海水浴場', area: '太平灣 · 黃海',
    copy: '沿著山海關路走到海邊，別墅與林蔭讓位給沙灘和礁石。面向太平灣，可以看見浪花在岸邊一進一退。',
    mapX: -24, mapZ: 15, x: -22, z: 13, lookX: -66, lookZ: 69, pitch: -0.025,
  },
};
const start = { x: -15, z: -13, lookX: 22, lookZ: 4.2, pitch: 0.055 };
const $ = (selector) => document.querySelector(selector);
const startButton = $('#start');
const mapTab = $('#map-tab');
const timeButton = $('#time');
const timeMenu = $('#time-menu');
const helpDialog = $('#help-dialog');
const mapDialog = $('#map-dialog');
const visitNote = $('#visit-note');
const status = $('#status');
const canvasMap = $('#map-canvas');
const needle = $('#needle');
const location = $('#location');
let roam;
let pendingRoam;
let statusTimer;
let walkRequest = 0;
let mode = 'golden';

for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = icon(element.dataset.icon);
}

const photoCredits = [
  ['花石樓', 'Windmemories', '20151212_Badaguan_01.jpg'],
  ['公主樓', 'StefanTsingtauer', '青岛居庸关路10号_2022-02-27.jpg'],
  ['第二海水浴場', 'Antigng', '青岛第二海水浴场.jpg'],
];
$('#photo-credits').innerHTML = `<p>地標照片（縮圖）</p><ul>${photoCredits.map(([name, author, file]) =>
  `<li>${name} · ${author} · <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}" target="_blank" rel="noopener">原圖</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a></li>`,
).join('')}</ul>`;

function notify(message, duration = 3300) {
  window.clearTimeout(statusTimer);
  status.textContent = message;
  status.hidden = !message;
  if (message && duration) statusTimer = window.setTimeout(() => { status.hidden = true; }, duration);
}

function roadName(x, z) {
  if (z > 7) return '太平灣海岸';
  const crossing = [[-12, '韶關路'], [15, '寧武關路'], [40, '紫荊關路']]
    .find(([road]) => Math.abs(x - road) < 4);
  const street = [[-6, '山海關路'], [-43, '居庸關路'], [-78, '臨淮關路']]
    .find(([road]) => Math.abs(z - road) < 8);
  return street?.[1] ?? crossing?.[1] ?? (z < -25 ? '八大關林蔭街區' : '山海關路');
}

function updateHud(position, yaw) {
  const heading = (Math.round(-yaw * 180 / Math.PI) % 360 + 360) % 360;
  needle.style.transform = `rotate(${heading}deg)`;
  const name = roadName(position.x, position.z);
  if (location.textContent !== name) location.textContent = name;
}

async function openWalk(place) {
  const request = ++walkRequest;
  try {
    if (!pendingRoam) {
      startButton.disabled = true;
      startButton.querySelector('span').textContent = '載入景觀…';
      notify('正在載入 3D 景觀', 0);
      pendingRoam = import('./roam.js').then(({ setupRoam }) => setupRoam($('#scene'), start, updateHud));
    }
    roam = await pendingRoam;
    if (request !== walkRequest) return;
    if (place) roam.teleport(place);
    roam.setMode(mode);
    document.body.dataset.view = 'explore';
    if (document.scrollingElement.scrollTop) window.scrollTo(0, 0);
    roam.setActive(true);
    roam.focus();
    notify('');
    if (place?.name) {
      $('#visit-kicker').textContent = place.area;
      $('#visit-title').textContent = place.name;
      $('#visit-copy').textContent = place.copy;
      visitNote.hidden = false;
    } else {
      visitNote.hidden = true;
    }
  } catch (error) {
    console.error('3D landscape initialization failed', error);
    pendingRoam = undefined;
    if (request !== walkRequest) return;
    roam?.setActive(false);
    document.body.dataset.view = 'cover';
    notify('無法啟動 3D 景觀。請確認瀏覽器支援 WebGL 2，再試一次。', 0);
  } finally {
    startButton.disabled = false;
    startButton.querySelector('span').textContent = '開始漫遊';
  }
}

$('#home').addEventListener('click', () => {
  walkRequest++;
  roam?.setActive(false);
  document.body.dataset.view = 'cover';
  needle.style.transform = 'rotate(109deg)';
  location.textContent = '山海關路';
  visitNote.hidden = true;
  notify('');
});
startButton.addEventListener('click', () => openWalk(start));
$('#walk-tab').addEventListener('click', () => {
  if (document.body.dataset.view === 'cover') openWalk(start);
  else roam?.focus();
});
$('#close-note').addEventListener('click', () => {
  visitNote.hidden = true;
  roam?.focus();
});

const mapPoint = (x, z) => [650 * (x + 75) / 153, 400 * (z + 104) / 150];

function drawMap() {
  const ctx = canvasMap.getContext('2d');
  ctx.fillStyle = '#354235';
  ctx.fillRect(0, 0, 650, 400);
  const shore = [];
  for (let x = -75; x <= 78; x += 3) {
    const z = roam?.shoreline(x) ?? (24 + 10.8 * Math.exp(-((x - 40) ** 2) / 370)
      - 5.1 * Math.exp(-((x + 12) ** 2) / 940) + 1.7 * Math.sin(x * 0.075));
    shore.push(mapPoint(x, z));
  }
  ctx.beginPath();
  for (const [x, z] of shore) ctx.lineTo(x, z);
  ctx.lineTo(650, 400);
  ctx.lineTo(0, 400);
  ctx.fillStyle = '#29444b';
  ctx.fill();
  ctx.strokeStyle = '#a09b76';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, z] of shore) ctx.lineTo(x, z);
  ctx.stroke();
  // Draw the represented streets in scene coordinates, aligned to the destination buttons.
  for (const [x1, z1, x2, z2] of [
    [-71, -78, 72, -78], [-71, -43, 72, -43], [-71, -6, 72, -6],
    [-12, -102, -12, 6], [15, -102, 15, 12], [40, -102, 40, 14],
  ]) {
    ctx.beginPath();
    ctx.moveTo(...mapPoint(x1, z1));
    ctx.lineTo(...mapPoint(x2, z2));
    ctx.strokeStyle = '#65705b';
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = '#c8b797';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.font = '14px "Badaguan Sans", sans-serif';
  ctx.fillStyle = '#e0d2b6';
  for (const [name, x, z] of [
    ['山海關路', -68, -10], ['居庸關路', -1, -48], ['臨淮關路', -68, -83], ['太平灣', 3, 39],
  ]) ctx.fillText(name, ...mapPoint(x, z));

  const position = roam?.getPosition();
  if (position && document.body.dataset.view === 'explore') {
    const [x, y] = mapPoint(position.x, position.z);
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f9f0d8';
    ctx.fill();
    ctx.strokeStyle = '#241f16';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
for (const [id, place] of Object.entries(places)) {
  const pin = document.createElement('button');
  const [x, y] = mapPoint(place.mapX, place.mapZ);
  pin.className = 'map-pin';
  pin.type = 'button';
  pin.style.left = `${x / 650 * 100}%`;
  pin.style.top = `${y / 400 * 100}%`;
  pin.dataset.place = id;
  pin.setAttribute('aria-label', `前往${place.name}`);
  pin.innerHTML = `<i>${icon('pin')}</i>`;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.place = id;
  button.textContent = place.name;
  $('#map-pins').append(pin);
  $('#map-destinations').append(button);
}
for (const button of document.querySelectorAll('[data-place]')) {
  button.addEventListener('click', () => {
    if (mapDialog.open) mapDialog.close();
    openWalk(places[button.dataset.place]);
  });
}

function openDialog(dialog) {
  roam?.release();
  closeTimeMenu();
  dialog.showModal();
  dialog.querySelector('[data-close]').focus();
}
function openMap() {
  mapTab.classList.add('active');
  $('#walk-tab').classList.remove('active');
  openDialog(mapDialog);
  drawMap();
  if (document.fonts) document.fonts.load('14px "Badaguan Sans"', '山海關路').then(drawMap).catch(() => {});
}
mapTab.addEventListener('click', openMap);
$('#panel-map').addEventListener('click', openMap);
$('#help').addEventListener('click', () => openDialog(helpDialog));
mapDialog.addEventListener('close', () => {
  mapTab.classList.remove('active');
  $('#walk-tab').classList.add('active');
});
for (const dialog of [mapDialog, helpDialog]) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.close();
    }
  });
}

function closeTimeMenu() {
  timeMenu.hidden = true;
  timeButton.setAttribute('aria-expanded', 'false');
}
timeButton.addEventListener('click', () => {
  timeMenu.hidden = !timeMenu.hidden;
  timeButton.setAttribute('aria-expanded', String(!timeMenu.hidden));
});
window.addEventListener('click', (event) => {
  if (!event.target.closest('.time-control')) closeTimeMenu();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !timeMenu.hidden) {
    closeTimeMenu();
    timeButton.focus();
  }
});
const modes = {
  day: ['晴朗午後', 'sun'], golden: ['金色夕陽', 'sunset'], dusk: ['藍調暮色', 'moon'],
};
for (const button of timeMenu.querySelectorAll('button')) {
  button.addEventListener('click', () => {
    mode = button.dataset.time;
    for (const option of timeMenu.querySelectorAll('button')) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    const [name, symbol] = modes[mode];
    $('#time-label').textContent = name;
    timeButton.firstElementChild.innerHTML = icon(symbol);
    closeTimeMenu();
    if (document.body.dataset.view === 'cover') openWalk(start);
    else {
      roam?.setMode(mode);
      roam?.focus();
    }
  });
}

for (const button of document.querySelectorAll('[data-move]')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    roam?.setTouch(button.dataset.move, true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, () => roam?.setTouch(button.dataset.move, false));
  }
}

const fullscreen = $('#fullscreen');
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notify('目前無法進入全螢幕。');
  }
});
document.addEventListener('fullscreenchange', () => {
  const enabled = Boolean(document.fullscreenElement);
  fullscreen.setAttribute('aria-label', enabled ? '離開全螢幕' : '全螢幕');
  fullscreen.setAttribute('aria-pressed', String(enabled));
  fullscreen.firstElementChild.innerHTML = icon(enabled ? 'shrink' : 'expand');
});

function makeSurf(AudioContext) {
  const context = new AudioContext();
  const noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const output = noise.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < output.length; i++) {
    brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
    output[i] = brown * 3.4;
  }
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 610;
  const level = context.createGain();
  level.gain.value = 0.38;
  const riseAndFall = context.createOscillator();
  riseAndFall.frequency.value = 0.17;
  const range = context.createGain();
  range.gain.value = 0.17;
  riseAndFall.connect(range).connect(level.gain);
  source.connect(filter).connect(level).connect(context.destination);
  source.start();
  riseAndFall.start();
  return context;
}
const sound = $('#sound');
let audio;
sound.addEventListener('click', async () => {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) {
    notify('這個瀏覽器無法播放海浪聲。');
    return;
  }
  try {
    const enabled = sound.getAttribute('aria-pressed') === 'true';
    audio ??= makeSurf(AudioContext);
    if (enabled) await audio.suspend();
    else await audio.resume();
    sound.setAttribute('aria-label', enabled ? '開啟海浪聲' : '關閉海浪聲');
    sound.setAttribute('aria-pressed', String(!enabled));
    sound.firstElementChild.innerHTML = icon(enabled ? 'mute' : 'sound');
  } catch {
    notify('目前無法播放海浪聲。');
  }
});
