import * as THREE from 'three';
import { createLandscape } from './landscape.js';
import { addArchitecture } from './buildings.js';
import { createAtmosphere } from './atmosphere.js';

const eyeHeight = 1.68;
const radius = 0.34;
const movementCodes = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'ShiftLeft', 'ShiftRight',
]);

export function setupRoam(container, start, onFrame) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(57, 1, 0.06, 2150);
  camera.rotation.order = 'YXZ';
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Static architecture and terrain only need a new shadow map when the light changes.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D 漫遊畫面');
  const world = createLandscape(scene);
  addArchitecture(scene, world);
  const atmosphere = createAtmosphere(scene, world);
  container.append(canvas);
  const held = new Set();
  const touch = new Set();
  let active = false;
  let dragging = null;
  let yaw = 0;
  let pitch = 0;
  let previous = 0;
  let elapsed = 0;
  let walkingPhase = 0;
  let motion = 0;
  let lightMode = 'golden';

  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width > 800 ? 1.45 : 1.3));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    const portraitFov = THREE.MathUtils.radToDeg(2 * Math.atan(0.355 / camera.aspect));
    camera.fov = THREE.MathUtils.clamp(portraitFov, 57, 82);
    camera.updateProjectionMatrix();
  }

  function fits(x, z) {
    const { minX, maxX, minZ, maxZ } = world.bounds;
    if (x < minX + radius || x > maxX - radius || z < minZ + radius ||
        z > Math.min(maxZ, world.shoreline(x) - 0.58)) return false;
    return !world.colliders.some((box) => x > box.minX - radius && x < box.maxX + radius &&
      z > box.minZ - radius && z < box.maxZ + radius);
  }

  function teleport(place) {
    const safeOffset = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2], [-2, 0], [2, 0]]
      .find(([dx, dz]) => fits(place.x + dx, place.z + dz));
    if (!safeOffset) return;
    const x = place.x + safeOffset[0];
    const z = place.z + safeOffset[1];
    camera.position.set(x, world.height(x, z) + eyeHeight, z);
    yaw = Math.atan2(x - place.lookX, z - place.lookZ);
    pitch = place.pitch ?? 0.025;
    camera.rotation.set(pitch, yaw, 0);
    motion = 0;
  }

  function look(dx, dy, scale = 0.0031) {
    yaw -= dx * scale;
    pitch = THREE.MathUtils.clamp(pitch - dy * scale, -1.4, 1.4);
  }

  function isPressed(...codes) {
    return codes.some((code) => held.has(code) || touch.has(code));
  }

  function release() {
    held.clear();
    touch.clear();
    dragging = null;
    canvas.classList.remove('dragging');
  }

  function frame(now) {
    const dt = previous ? Math.min((now - previous) / 1000, 0.06) : 0;
    previous = now;
    if (!active) return;
    if (!reducedMotion) elapsed += dt;
    const keyboardLook = 1.57 * dt;
    look(
      Number(isPressed('KeyE')) - Number(isPressed('KeyQ')),
      Number(isPressed('KeyF')) - Number(isPressed('KeyR')),
      keyboardLook,
    );
    const forward = Number(isPressed('KeyW', 'ArrowUp')) - Number(isPressed('KeyS', 'ArrowDown'));
    const right = Number(isPressed('KeyD', 'ArrowRight')) - Number(isPressed('KeyA', 'ArrowLeft'));
    const speed = isPressed('ShiftLeft', 'ShiftRight') ? 5.8 : 2.85;

    const { position } = camera;
    const previousX = position.x;
    const previousZ = position.z;
    if (forward || right) {
      const distance = dt * speed / Math.hypot(forward, right);
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const x = position.x + (-sin * forward + cos * right) * distance;
      const z = position.z + (-cos * forward - sin * right) * distance;
      if (fits(x, position.z)) position.x = x;
      if (fits(position.x, z)) position.z = z;
    }

    const travelled = Math.hypot(position.x - previousX, position.z - previousZ);
    const targetMotion = travelled > 0.001 && !reducedMotion ? 1 : 0;
    walkingPhase += travelled * 4.6;
    motion = THREE.MathUtils.damp(motion, targetMotion, 10, dt);
    const floor = THREE.MathUtils.damp(
      position.y, world.height(position.x, position.z) + eyeHeight, 14, dt,
    );
    position.y = floor + Math.sin(walkingPhase) * motion * dt * 0.27;
    camera.rotation.set(pitch, yaw, 0);
    world.update(elapsed);
    atmosphere.update(elapsed);
    renderer.render(scene, camera);
    onFrame(position, yaw);
  }

  function setActive(value) {
    if (value === active) return;
    active = value;
    previous = 0;
    if (!active) release();
    renderer.setAnimationLoop(active ? frame : null);
    if (active) {
      resize();
      frame(performance.now());
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!active || event.button !== 0 || dragging) return;
    canvas.setPointerCapture(event.pointerId);
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.classList.add('dragging');
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragging?.id !== event.pointerId) return;
    look(event.clientX - dragging.x, event.clientY - dragging.y, event.pointerType === 'touch' ? 0.005 : 0.0031);
    dragging.x = event.clientX;
    dragging.y = event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, (event) => {
      if (dragging?.id !== event.pointerId) return;
      dragging = null;
      canvas.classList.remove('dragging');
    });
  }

  window.addEventListener('keydown', (event) => {
    if (!active || event.altKey || event.ctrlKey || event.metaKey || !movementCodes.has(event.code) ||
        document.querySelector('dialog[open]') || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    // Leave native arrow navigation available while a control has keyboard focus.
    if (event.code.startsWith('Arrow') && event.target.closest?.('button, a')) return;
    event.preventDefault();
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', release);
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    release();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.shadowMap.needsUpdate = true;
  });

  resize();
  teleport(start);
  return {
    setActive,
    teleport,
    release,
    focus: () => canvas.focus({ preventScroll: true }),
    setTouch: (code, enabled) => enabled ? touch.add(code) : touch.delete(code),
    setMode(mode) {
      if (mode === lightMode) return;
      lightMode = mode;
      atmosphere.setMode(mode);
      renderer.shadowMap.needsUpdate = true;
    },
    getPosition: () => ({ x: camera.position.x, z: camera.position.z }),
    shoreline: world.shoreline,
  };
}
