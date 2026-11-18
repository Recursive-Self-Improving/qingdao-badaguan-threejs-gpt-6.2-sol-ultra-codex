import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(paint, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  paint(canvas.getContext('2d'), seededRandom(seed));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

function grain(ctx, random, count, opacity) {
  for (let i = 0; i < count; i++) {
    const shade = random() < 0.5 ? 14 : 255;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${opacity * random()})`;
    ctx.fillRect(random() * 512, random() * 512, 0.5 + 2.8 * random(), 0.5 + 2.4 * random());
  }
}

function materials() {
  const stoneMap = texture((ctx, random) => {
    ctx.fillStyle = '#716b61';
    ctx.fillRect(0, 0, 512, 512);
    const palette = ['#a79681', '#a19b8f', '#afa79a', '#b5a392', '#9d8b78', '#b6afa0', '#ad9e91'];
    for (let row = -1; row < 9; row++) {
      for (let column = -1; column < 7; column++) {
        const x = column * 85.33 + row % 2 * 42.67;
        const y = row * 64;
        const w = 81.5;
        const h = 60;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 2);
        ctx.lineTo(x + w - 8, y + 1);
        ctx.lineTo(x + w - 1, y + 7);
        ctx.lineTo(x + w, y + h - 10);
        ctx.lineTo(x + w - 5, y + h - 2);
        ctx.lineTo(x + 10, y + h);
        ctx.lineTo(x + 1, y + h - 5);
        ctx.lineTo(x + 2, y + 9);
        ctx.closePath();
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.fill();
        ctx.strokeStyle = 'rgba(50, 39, 33, .44)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(246, 226, 200, .32)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    grain(ctx, random, 19000, 0.22);
  }, 10);

  const graniteMap = texture((ctx, random) => {
    ctx.fillStyle = '#867f74';
    ctx.fillRect(0, 0, 512, 512);
    const palette = ['#a09585', '#9b9389', '#a49d90', '#a29281', '#988c7c', '#a9a294', '#a69b8d'];
    for (let row = 0; row < 11; row++) {
      const y1 = row * 46.55;
      const y2 = y1 + 46.55;
      let x = -25 - random() * 42;
      while (x < 512) {
        const w = 28 + random() * 46;
        const skew = random() * 7 - 3.5;
        ctx.beginPath();
        ctx.moveTo(x + 3, y1 + 2 + random() * 4);
        ctx.lineTo(x + w * 0.52, y1 + 1 + random() * 4);
        ctx.lineTo(x + w - 2, y1 + 2 + random() * 4);
        ctx.lineTo(x + w - 1 + skew, y1 + 23);
        ctx.lineTo(x + w - 3, y2 - 3 - random() * 3);
        ctx.lineTo(x + w * 0.47, y2 - 1 - random() * 4);
        ctx.lineTo(x + 3, y2 - 3 - random() * 3);
        ctx.lineTo(x + 1 + skew, y1 + 24);
        ctx.closePath();
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.fill();
        ctx.strokeStyle = 'rgba(221, 206, 181, .22)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        x += w;
      }
    }
    const inclusions = ['#bcb2a3', '#77716a', '#a3907b', '#a29d91', '#6d6a62', '#c6b5a0'];
    for (let i = 0; i < 4400; i++) {
      const x = random() * 512;
      const y = random() * 512;
      ctx.globalAlpha = 0.16 + random() * 0.25;
      ctx.fillStyle = inclusions[Math.floor(random() * inclusions.length)];
      ctx.beginPath();
      ctx.ellipse(x, y, 0.65 + random() * 4.2, 0.4 + random() * 3.4, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    grain(ctx, random, 17000, 0.26);
  }, 78);

  const tileMap = texture((ctx, random) => {
    ctx.fillStyle = '#673525';
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) {
      for (let column = -1; column < 9; column++) {
        const x = column * 64 + row % 2 * 32;
        const y = row * 64;
        const tone = Math.floor(16 * random());
        const shade = ctx.createLinearGradient(x, y, x + 64, y);
        shade.addColorStop(0, `rgb(${99 + tone}, ${46 + tone}, ${34 + tone})`);
        shade.addColorStop(0.34, `rgb(${170 + tone}, ${85 + tone}, ${49 + tone})`);
        shade.addColorStop(0.7, `rgb(${147 + tone}, ${61 + tone}, ${37 + tone})`);
        shade.addColorStop(1, `rgb(${110 + tone}, ${49 + tone}, ${32 + tone})`);
        ctx.fillStyle = shade;
        ctx.fillRect(x + 1, y + 2, 62, 60);
        ctx.fillStyle = 'rgba(235, 150, 92, .25)';
        ctx.fillRect(x + 5, y + 4, 53, 2);
      }
    }
    grain(ctx, random, 12000, 0.15);
  }, 33);

  const plasterMap = texture((ctx, random) => {
    ctx.fillStyle = '#d5d1c6';
    ctx.fillRect(0, 0, 512, 512);
    grain(ctx, random, 34000, 0.16);
  }, 55);
  const stucco = (color) => new THREE.MeshStandardMaterial({ color, map: plasterMap, roughness: 0.92 });
  const plain = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  return {
    stone: new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: 0.055, roughness: 0.94 }),
    granite: new THREE.MeshStandardMaterial({ map: graniteMap, bumpMap: graniteMap, bumpScale: 0.072, roughness: 0.96 }),
    cap: stucco('#d0bda3'),
    base: stucco('#a39b88'),
    slate: stucco('#5c625a'),
    teal: stucco('#488a7d'),
    emerald: stucco('#398878'),
    cream: stucco('#e8d7a9'),
    honey: stucco('#d4aa83'),
    pink: stucco('#cf9d83'),
    white: stucco('#eee5c9'),
    tiles: new THREE.MeshStandardMaterial({ map: tileMap, bumpMap: tileMap, bumpScale: 0.035, roughness: 0.88, side: THREE.DoubleSide }),
    terracotta: plain('#a55033'),
    frame: plain('#373a2b'),
    wood: plain('#694834'),
    turquoise: plain('#89b8a8'),
    glass: plain('#425a57', 0.35),
    glassLight: plain('#758d88', 0.32),
    amber: plain('#987950', 0.38),
    garnet: plain('#885f59', 0.4),
    wroughtIron: plain('#32392b', 0.68),
    geranium: plain('#ab4a45'),
    leaf: plain('#566947'),
  };
}

function repeatUV(geometry, uScale, vScale, start = 0, count = geometry.attributes.uv.count) {
  const uv = geometry.attributes.uv;
  for (let i = start; i < start + count; i++) uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
}

function box(parent, x, y, z, width, height, depth, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  repeatUV(geometry, depth / 3, height / 2.5, 0, 8);
  repeatUV(geometry, width / 3, depth / 2.5, 8, 8);
  repeatUV(geometry, width / 3, height / 2.5, 16, 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, x, y, z, top, bottom, height, material, segments = 32) {
  const geometry = new THREE.CylinderGeometry(top, bottom, height, segments);
  repeatUV(geometry, Math.PI * (top + bottom) / 3, height / 2.5, 0, 2 * (segments + 1));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function facade(parent, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  parent.add(group);
  return group;
}

function polygon(parent, points, z, material) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  for (const pt of points.slice(1)) shape.lineTo(...pt);
  const geometry = new THREE.ShapeGeometry(shape);
  repeatUV(geometry, 1 / 3, 1 / 2.5);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  parent.add(mesh);
  return mesh;
}

function topArch(parent, x, y, width, height, z, material, pointed) {
  const arch = Math.min(height * 0.48, width * (pointed ? 0.74 : 0.50));
  const half = width / 2;
  const spring = y + height - arch;
  const shape = new THREE.Shape();
  shape.moveTo(x - half, y);
  shape.lineTo(x + half, y);
  shape.lineTo(x + half, spring);
  if (pointed) {
    shape.quadraticCurveTo(x + half * 0.74, spring + arch * 0.66, x, y + height);
    shape.quadraticCurveTo(x - half * 0.74, spring + arch * 0.66, x - half, spring);
  } else {
    shape.bezierCurveTo(x + half, spring + arch * 1.33, x - half, spring + arch * 1.33, x - half, spring);
  }
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), material);
  mesh.position.z = z;
  parent.add(mesh);
}

function archWindow(parent, m, x, bottom, width, height, { stone = m.cap, stained = false, pointed = true, door = false } = {}) {
  topArch(parent, x, bottom - 0.08, width + 0.3, height + 0.25, 0.025, stone, pointed);
  topArch(parent, x, bottom, width + 0.06, height + 0.06, 0.055, m.frame, pointed);
  topArch(parent, x, bottom + 0.05, width - 0.08, height - 0.09, 0.065, door ? m.wood : m.glass, pointed);
  box(parent, x, bottom + height * 0.44, 0.08, 0.035, height * 0.8, 0.035, door ? m.frame : stone);
  for (const fraction of [0.26, 0.49, 0.71]) {
    box(parent, x, bottom + height * fraction, 0.08, width - 0.06, 0.024, 0.04, door ? m.frame : stone);
  }
  if (stained) {
    box(parent, x - width * 0.24, bottom + height * 0.38, 0.074, width * 0.38, height * 0.18, 0.012, m.amber);
    box(parent, x + width * 0.24, bottom + height * 0.61, 0.074, width * 0.38, height * 0.18, 0.012, m.garnet);
  }
  box(parent, x, bottom - 0.08, 0.105, width + 0.29, 0.13, 0.26, stone);
}

function sash(parent, m, x, bottom, width, height, { trim = m.white, shutters = false, flowers = false } = {}) {
  const centerY = bottom + height / 2;
  box(parent, x, centerY, 0.025, width + 0.20, height + 0.19, 0.12, trim);
  box(parent, x, centerY, 0.088, width, height, 0.035, m.frame);
  box(parent, x, centerY, 0.11, width - 0.1, height - 0.11, 0.028, m.glass);
  box(parent, x, centerY + height * 0.22, 0.122, width - 0.1, height * 0.43, 0.016, m.glassLight);
  box(parent, x, centerY, 0.136, 0.045, height, 0.034, trim);
  for (const dy of [-0.23, 0.2]) {
    box(parent, x, centerY + dy * height, 0.136, width, 0.04, 0.037, trim);
  }
  box(parent, x, bottom - 0.055, 0.1, width + 0.29, 0.10, 0.28, trim);
  if (shutters) {
    for (const sign of [-1, 1]) {
      const offset = x + sign * (width * 0.75 + 0.09);
      box(parent, offset, centerY, 0.047, width * 0.43, height - 0.025, 0.09, m.wood);
      for (let i = 1; i < 7; i++) {
        box(parent, offset, bottom + height * i / 7, 0.097, width * 0.37, 0.015, 0.026, m.base);
      }
    }
  }
  if (flowers) {
    box(parent, x, bottom - 0.12, 0.20, width + 0.12, 0.17, 0.25, m.wood);
    for (let i = 0; i < 6; i++) {
      const flowerX = x - width * 0.43 + i * width / 5.8;
      cylinder(parent, flowerX, bottom + 0.015, 0.25, 0.075, 0.1, 0.17, m.leaf, 5);
      cylinder(parent, flowerX, bottom + 0.11, 0.26, 0.061, 0.04, 0.065, m.geranium, 5);
    }
  }
}

function slopedRoof(parent, m, x, y, z, width, length, rise, wall) {
  const roof = facade(parent, x, z);
  const half = width / 2;
  const run = half + 0.26;
  const angle = Math.atan2(rise, run);
  const panelWidth = Math.hypot(run, rise);
  for (const side of [-1, 1]) {
    const panel = box(roof, side * run / 2, y + rise / 2, 0, panelWidth, 0.145, length + 0.56, m.tiles);
    const positions = panel.geometry.attributes.position;
    const uv = panel.geometry.attributes.uv;
    for (let i = 8; i < 16; i++) {
      uv.setXY(i, positions.getZ(i) / 2.35, -side * positions.getX(i) / 2.1);
    }
    panel.rotation.z = -side * angle;
    box(roof, side * run, y - 0.055, 0, 0.12, 0.20, length + 0.63, m.terracotta);
  }
  const end = facade(roof, 0, length / 2);
  const back = facade(roof, 0, -length / 2, Math.PI);
  for (const face of [end, back]) {
    polygon(face, [[-half, y - 0.12], [half, y - 0.12], [0, y + rise]], 0, wall);
    for (const side of [-1, 1]) {
      const verge = box(face, side * run / 2, y + rise / 2 - 0.10, 0.095, panelWidth, 0.13, 0.33, m.cap);
      verge.rotation.z = -side * angle;
    }
  }
  const ridge = cylinder(roof, 0, y + rise + 0.06, 0, 0.115, 0.115, length + 0.63, m.terracotta, 12);
  ridge.rotation.x = Math.PI / 2;
  return end;
}

function urn(parent, m, x, z, base) {
  box(parent, x, base + 0.19, z, 0.61, 0.38, 0.61, m.cap);
  const profile = [[0.23, 0], [0.23, 0.08], [0.14, 0.13], [0.16, 0.22], [0.30, 0.38], [0.33, 0.51], [0.38, 0.54], [0.36, 0.60], [0.29, 0.60], [0.27, 0.49]];
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), 20), m.cap);
  mesh.position.set(x, base + 0.37, z);
  parent.add(mesh);
}

function balustrade(parent, m, center, width, y, depth) {
  box(parent, center, y + 0.63, depth, width + 0.12, 0.11, 0.16, m.cap);
  box(parent, center, y + 0.063, depth, width + 0.12, 0.13, 0.16, m.cap);
  const postCount = Math.ceil(width * 2.25);
  for (let i = 0; i <= postCount; i++) {
    const x = center - width / 2 + width * i / postCount;
    cylinder(parent, x, y + 0.28, depth, 0.076, 0.05, 0.25, m.cap, 8);
    cylinder(parent, x, y + 0.47, depth, 0.043, 0.076, 0.19, m.cap, 8);
  }
}

function steps(parent, material, x, front, width, height, count, run) {
  const stepHeight = height / count;
  for (let i = 0; i < count; i++) {
    const depth = (i + 1) * run;
    box(parent, x, stepHeight * (count - i) / 2, front + depth / 2, width, stepHeight * (count - i), depth, material);
  }
}

function stoneTower(parent, m, x, z, radius, height, battlements = true) {
  cylinder(parent, x, height / 2, z, radius, radius, height, m.granite, 48);
  cylinder(parent, x, 0.32, z, radius + 0.12, radius + 0.20, 0.64, m.base, 48);
  for (const floor of [0.42, 0.74, 0.92]) {
    const y = height * floor;
    cylinder(parent, x, y, z, radius + 0.10, radius + 0.09, 0.15, m.cap, 48);
  }
  for (const angle of [-2.75, -2.02, -1.24, -0.53, 0.34, 1.17, 2.02, 2.79]) {
    const wall = facade(parent, x + Math.sin(angle) * (radius + 0.07), z + Math.cos(angle) * (radius + 0.07), angle);
    archWindow(wall, m, 0, height * 0.50, 0.55, height * 0.19, { stained: true });
    archWindow(wall, m, 0, height * 0.76, 0.43, height * 0.115);
  }
  cylinder(parent, x, height - 0.07, z, radius + 0.20, radius + 0.19, 0.20, m.cap, 48);
  if (battlements) {
    for (let i = 0; i < 18; i++) {
      const angle = i * Math.PI / 9;
      const battlement = facade(parent, x + Math.sin(angle) * (radius - 0.03), z + Math.cos(angle) * (radius - 0.03), angle);
      box(battlement, 0, height + 0.19, 0, 0.35, 0.56, 0.42, m.granite);
      box(battlement, 0, height + 0.47, 0, 0.39, 0.10, 0.46, m.cap);
    }
  }
}

function huashi(parent, m) {
  box(parent, -2.08, 2.92, 1.06, 9.8, 6.05, 7.16, m.granite);
  box(parent, -2.08, 0.29, 1.06, 10.05, 0.57, 7.38, m.base);
  box(parent, -2.08, 3.15, 1.06, 9.97, 0.13, 7.30, m.cap);
  box(parent, -2.08, 5.91, 1.06, 10.16, 0.19, 7.56, m.cap);
  slopedRoof(parent, m, -2.08, 6.02, 1.07, 9.77, 7.37, 2.36, m.granite);
  box(parent, -5.3, 8.2, 1.03, 0.70, 2.29, 0.86, m.granite);
  box(parent, -5.3, 9.34, 1.03, 0.88, 0.17, 1.03, m.cap);

  stoneTower(parent, m, 3.07, -0.81, 2.15, 10.52);
  stoneTower(parent, m, 3.51, 3.12, 1.48, 8.18, false);
  cylinder(parent, 3.51, 9.02, 3.12, 0.09, 1.67, 1.88, m.tiles, 22);
  cylinder(parent, 3.51, 10.05, 3.12, 0.014, 0.048, 0.43, m.wroughtIron, 7);

  const north = facade(parent, -2.08, -2.52, Math.PI);
  for (const x of [-3.56, -1.27, 0.94, 3.41]) {
    archWindow(north, m, x, 3.69, 0.77, 1.76, { stained: true });
  }
  for (const x of [-3.22, 3.35]) archWindow(north, m, x, 1.14, 0.62, 1.44);
  archWindow(north, m, 0, 0.67, 1.21, 2.00, { door: true });

  const west = facade(parent, -6.99, 1.06, -Math.PI / 2);
  const south = facade(parent, -2.08, 4.65);
  for (const wall of [west, south]) {
    for (const x of [-2.67, 0, 2.65]) {
      archWindow(wall, m, x, 1.0, 0.67, 1.64, { pointed: false });
      archWindow(wall, m, x, 3.72, 0.83, 1.65, { stained: true });
    }
  }

  box(north, 0, 0.28, 0.79, 4.42, 0.62, 1.58, m.base);
  steps(north, m.cap, 0, 1.50, 2.59, 0.64, 4, 0.23);
  box(north, 0, 2.85, 0.76, 4.54, 0.33, 1.56, m.cap);
  box(north, 0, 3.055, 0.80, 4.75, 0.11, 1.72, m.base);
  balustrade(north, m, 0, 4.44, 3.08, 1.57);
  for (const x of [-1.64, 1.64]) {
    box(north, x, 0.73, 1.3, 0.49, 0.25, 0.49, m.cap);
    cylinder(north, x, 1.77, 1.3, 0.13, 0.18, 1.93, m.cap, 14);
    box(north, x, 2.69, 1.3, 0.40, 0.17, 0.40, m.cap);
    urn(north, m, x * 1.38, 2.06, 0.02);
  }

  // Deep corner stones catch the low sunlight and make the granite mass read from the road.
  for (const z of [-2.54, 4.67]) {
    for (let i = 0; i < 13; i++) {
      box(parent, -6.97, 0.68 + i * 0.37, z, 0.45 + i % 2 * 0.16, 0.33, 0.37, m.base);
    }
  }
}

function princess(parent, m) {
  box(parent, -0.25, 2.61, -0.29, 8.34, 5.35, 7.6, m.teal);
  box(parent, -0.25, 0.40, -0.29, 8.54, 0.75, 7.78, m.stone);
  box(parent, -0.25, 2.70, -0.29, 8.45, 0.13, 7.71, m.turquoise);
  const frontGable = slopedRoof(parent, m, -0.25, 5.24, -0.29, 8.35, 7.65, 3.21, m.teal);
  sash(frontGable, m, 0, 5.60, 0.54, 0.88);
  box(parent, 3.2, 2.93, 0.61, 2.77, 5.93, 3.25, m.emerald);
  const turretFace = slopedRoof(parent, m, 3.2, 5.86, 0.61, 2.79, 3.27, 3.15, m.emerald);
  sash(turretFace, m, 0, 6.16, 0.48, 1.05);
  sash(turretFace, m, 0, 3.57, 0.54, 1.38, { flowers: true });
  cylinder(parent, 3.2, 9.25, 0.61, 0.035, 0.07, 0.50, m.wroughtIron, 8);
  box(parent, -2.7, 6.92, -0.77, 0.56, 2.3, 0.73, m.stone);
  box(parent, -2.7, 8.13, -0.77, 0.65, 0.13, 0.81, m.cap);

  const front = facade(parent, -0.25, 3.52);
  for (const x of [-2.86, -0.75, 1.50, 3.12]) {
    sash(front, m, x, 3.42, 0.76, 1.20, { flowers: x < 0 });
  }
  for (const x of [-2.62, 1.7, 3.1]) {
    sash(front, m, x, 1.16, 0.91, 1.28, { flowers: true });
  }
  archWindow(front, m, -0.52, 0.56, 0.90, 2.01, { stone: m.white, door: true, pointed: false });
  box(front, 0, 0.24, 0.78, 7.50, 0.53, 1.61, m.base);
  steps(front, m.cap, -0.52, 1.56, 2.08, 0.46, 3, 0.24);
  for (const x of [-2.55, 2.55]) balustrade(front, m, x, 2.14, 0.48, 1.51);

  const rear = facade(parent, -0.25, -4.12, Math.PI);
  const west = facade(parent, -4.43, -0.29, -Math.PI / 2);
  const east = facade(parent, 3.93, -0.29, Math.PI / 2);
  for (const wall of [rear, west, east]) {
    for (const x of [-2.65, 0, 2.65]) {
      sash(wall, m, x, 1.17, 0.72, 1.36);
      sash(wall, m, x, 3.45, 0.68, 1.17);
    }
  }
}

function villa(parent, m, style) {
  const { width, length, height, rise, wall, halfTimber = false, veranda = false } = style;
  box(parent, 0, height / 2, 0, width, height, length, wall);
  box(parent, 0, 0.33, 0, width + 0.22, 0.70, length + 0.22, m.stone);
  box(parent, 0, height - 0.08, 0, width + 0.30, 0.16, length + 0.28, m.cap);
  box(parent, 0, height * 0.49, 0, width + 0.13, 0.13, length + 0.13, m.cap);
  const front = slopedRoof(parent, m, 0, height, 0, width, length, rise, wall);
  sash(front, m, 0, height + 0.35, 0.63, 0.87);
  box(parent, -width * 0.28, height + rise * 0.62, -length * 0.23, 0.56, 1.63, 0.71, m.stone);
  box(parent, -width * 0.28, height + rise * 0.62 + 0.83, -length * 0.23, 0.72, 0.13, 0.84, m.cap);
  if (halfTimber) {
    const diagonalWidth = width * 0.20;
    for (const side of [-1, 1]) {
      const strut = box(front, side * width * 0.21, height + rise * 0.15, 0.093, diagonalWidth, 0.11, 0.13, m.wood);
      strut.rotation.z = side * Math.PI / 4;
    }
    box(front, 0, height + 0.12, 0.085, width - 0.29, 0.12, 0.14, m.wood);
    box(front, 0, height + rise * 0.81, 0.085, 0.13, rise * 0.34, 0.13, m.wood);
  }

  const faces = [front, facade(parent, 0, -length / 2, Math.PI), facade(parent, -width / 2, 0, -Math.PI / 2), facade(parent, width / 2, 0, Math.PI / 2)];
  faces.forEach((face, i) => {
    const span = i < 2 ? width : length;
    for (const x of [-span * 0.30, 0, span * 0.30]) {
      sash(face, m, x, height * 0.61, 0.84, height * 0.25, { shutters: halfTimber || veranda, flowers: i === 0 });
      if (i === 0 && x === 0) {
        archWindow(face, m, x, 0.56, 1.0, height * 0.40, { door: true, pointed: false });
      } else {
        sash(face, m, x, height * 0.16, 0.90, height * 0.26, { shutters: halfTimber });
      }
    }
  });
  const stoopWidth = veranda ? width * 0.81 : 2.54;
  steps(front, m.cap, 0, 0.04, stoopWidth, 0.56, 3, 0.24);
  if (veranda) {
    box(front, 0, 2.78, 0.67, stoopWidth + 0.31, 0.25, 1.5, m.cap);
    balustrade(front, m, 0, stoopWidth, 2.88, 1.39);
    for (const x of [-stoopWidth * 0.44, stoopWidth * 0.44]) {
      cylinder(front, x, 1.60, 1.17, 0.11, 0.15, 2.2, m.white, 14);
      box(front, x, 0.62, 1.17, 0.36, 0.22, 0.36, m.cap);
    }
  }
}

function finishBuilding(scene, parent, name) {
  // Merge by material so the hundreds of trims and panes cost one draw call per finish.
  parent.updateMatrixWorld(true);
  const byMaterial = new Map();
  parent.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    geometry.applyMatrix4(object.matrixWorld);
    if (!byMaterial.has(object.material)) byMaterial.set(object.material, []);
    byMaterial.get(object.material).push(geometry);
  });
  const building = new THREE.Group();
  building.name = name;
  for (const [material, parts] of byMaterial) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    building.add(mesh);
  }
  scene.add(building);
}

export function addArchitecture(scene, world) {
  const m = materials();
  const building = (name, x, z, rotation, design) => {
    const group = new THREE.Group();
    group.position.set(x, world.height(x, z) + 0.015, z);
    group.rotation.y = rotation;
    design(group, m);
    finishBuilding(scene, group, name);
  };

  building('花石樓', 25, 1, 0, huashi);
  world.addCollider(17.8, 27.9, -1.7, 5.8);
  world.addCollider(25.8, 30.3, -2.2, 2.4);
  world.addCollider(26.8, 30.2, 2.5, 5.9);
  world.addCollider(20.1, 24.9, -3.89, -1.3);

  building('公主樓', -27.5, -54.5, 0, princess);
  world.addCollider(-32.1, -22.7, -58.7, -50.9);
  world.addCollider(-31.5, -23.5, -51.4, -49.2);

  const villas = [
    { x: -33.4, z: -23.0, rotation: 0, width: 10.3, length: 9.6, height: 5.9, rise: 3.0, wall: m.cream, halfTimber: true },
    { x: 5.6, z: -23.6, rotation: 0, width: 10.7, length: 8.4, height: 5.7, rise: 2.1, wall: m.honey, veranda: true },
    { x: 29.3, z: -56.2, rotation: 0, width: 10.7, length: 9.4, height: 6.0, rise: 3.0, wall: m.pink, halfTimber: true },
    { x: -29.0, z: -83.9, rotation: 0, width: 12.0, length: 8.1, height: 6.2, rise: 2.9, wall: m.honey, veranda: true },
    { x: 2.7, z: -90.0, rotation: 0, width: 10.6, length: 9.2, height: 5.8, rise: 3.1, wall: m.cream, halfTimber: true },
  ];
  villas.forEach((style) => {
    const { x, z, rotation, width, length } = style;
    building('八大關歷史風貌別墅', x, z, rotation, (parent) => villa(parent, m, style));
    world.addCollider(x - width / 2 - 0.15, x + width / 2 + 0.15, z - length / 2 - 0.15, z + length / 2 + 0.65);
  });
}
