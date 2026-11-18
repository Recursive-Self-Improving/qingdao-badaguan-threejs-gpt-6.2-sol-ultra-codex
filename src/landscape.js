import * as THREE from 'three';

const EAST_WEST = [-6, -43, -78];
const NORTH_SOUTH = [-12, 15, 40];
const bounds = { minX: -70, maxX: 72, minZ: -105, maxZ: 37 };

function shoreline(x) {
  const headland = 10.8 * Math.exp(-((x - 40) ** 2) / 370);
  const bay = 5.1 * Math.exp(-((x + 12) ** 2) / 940);
  return 24 + headland - bay + 1.7 * Math.sin(x * 0.075) + 0.55 * Math.sin(x * 0.22);
}

function groundHeight(x, z) {
  const inland = shoreline(x) - z;
  const highGround = 1.08 + Math.max(0, -z - 9) * 0.013
    + 0.16 * Math.sin(x * 0.09 + z * 0.04) + 0.13 * Math.sin(z * 0.14);
  return THREE.MathUtils.lerp(inland * 0.068, highGround, THREE.MathUtils.smoothstep(inland, 0, 21));
}

function roadBend(x) {
  return Math.sin((x - 24) * 0.055) * 1.1;
}

function laneBend(z) {
  return Math.sin((z + 6) * 0.036) * 0.6;
}

function roadDistance(x, z) {
  const horizontal = Math.min(...EAST_WEST.map((road) => Math.abs(z - road - roadBend(x))));
  const vertical = Math.min(...NORTH_SOUTH.map((road) => Math.abs(x - road - laneBend(z))));
  return Math.min(horizontal - 2.65, z < 7 ? vertical - 2.25 : 99);
}

function promenadeZ(x) {
  const shore = shoreline(x);
  return shore - 10.3 - 1.1 * Math.sin(x * 0.072);
}

function makeTerrain() {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLandscape;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandscape = position.xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vLandscape;
      float soilHash(vec2 point) {
        vec3 p = fract(vec3(point.xyx) * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float soilNoise(vec2 point) {
        vec2 base = floor(point);
        vec2 t = fract(point);
        t = t*t*(3.0 - 2.0*t);
        return mix(mix(soilHash(base), soilHash(base + vec2(1, 0)), t.x),
          mix(soilHash(base + vec2(0, 1)), soilHash(base + vec2(1, 1)), t.x), t.y);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p = vLandscape;
      float dx = p.x - 40.0;
      float bx = p.x + 12.0;
      float shore = 24.0 + 10.8*exp(-(dx*dx)/370.0) - 5.1*exp(-(bx*bx)/940.0)
        + 1.7*sin(p.x*0.075) + 0.55*sin(p.x*0.22);
      float inland = shore - p.y;
      float grain = soilNoise(p*0.73);
      float coarse = soilNoise(p*0.18);
      float filterWidth = max(length(dFdx(p)), length(dFdy(p)));
      float fine = (soilHash(floor(p*56.0)) - 0.5) * (1.0-smoothstep(0.019, 0.082, filterWidth));
      float clutter = soilNoise(p*6.9) + fine*0.42;
      float grass = smoothstep(0.22, 0.80, coarse*0.57 + grain*0.43);
      vec3 dirt = mix(vec3(0.092,0.105,0.033), vec3(0.179,0.210,0.061), grass);
      dirt = mix(dirt, vec3(0.202,0.152,0.083), smoothstep(0.56,0.83,soilNoise(p*0.28))*0.64);
      dirt *= 0.8 + clutter*0.39;
      float damp = smoothstep(-0.6, 4.1, inland + (grain - 0.5)*0.7);
      vec3 sand = mix(vec3(0.318,0.219,0.129), vec3(0.603,0.435,0.253), damp);
      sand *= 0.90 + clutter*0.18 + sin(inland*6.0 + grain*4.0)*0.018;
      float dune = smoothstep(5.9,10.4,inland + (grain-0.5)*4.0 + (coarse-0.5)*3.0);
      vec3 ground = mix(sand, dirt, dune);
      float horizontal = p.y - sin((p.x - 24.0)*0.055)*1.1;
      float vertical = p.x - sin((p.y + 6.0)*0.036)*0.6;
      float ew = min(abs(horizontal + 6.0), min(abs(horizontal + 43.0), abs(horizontal + 78.0)));
      float ns = min(abs(vertical + 12.0), min(abs(vertical - 15.0), abs(vertical - 40.0)));
      float lane = min(ew - 2.65, max(ns - 2.25, p.y - 7.0));
      lane = max(lane, abs(p.x) - 115.0);
      vec2 tile = p * vec2(3.0, 5.8);
      tile.x += 0.5*mod(floor(tile.y), 2.0);
      vec2 tileEdge = min(fract(tile), 1.0-fract(tile));
      float tileMask = smoothstep(0.025 - filterWidth, 0.065 + filterWidth, min(tileEdge.x,tileEdge.y));
      vec3 sidewalk = mix(vec3(0.206,0.151,0.108), vec3(0.286,0.168,0.116), tileMask);
      sidewalk *= 0.82 + 0.25*soilHash(floor(tile)) + clutter*0.13;
      sidewalk = mix(sidewalk, vec3(0.357,0.330,0.272), 1.0 - smoothstep(0.09,0.19,abs(lane - 0.15)));
      ground = mix(ground, sidewalk, (1.0-smoothstep(1.50,1.68,lane)) * smoothstep(0.0,1.9,dune*3.0));
      vec3 asphalt = mix(vec3(0.093,0.098,0.098), vec3(0.169,0.163,0.150), 0.28*coarse+0.52*grain+0.20*clutter);
      asphalt *= 0.88 + clutter*0.21 + fine*0.40;
      asphalt *= mix(0.75, 1.0, smoothstep(0.0,0.95,-lane));
      float stripe = (1.0-smoothstep(0.038,0.075 + filterWidth*0.35,abs(horizontal+6.0)))
        * smoothstep(4.0,4.8,ns) * smoothstep(0.0,0.14,sin(p.x*0.82))
        * (0.77 + 0.23*clutter);
      asphalt = mix(asphalt, vec3(0.434,0.299,0.061), stripe*0.69);
      ground = mix(ground, asphalt, (1.0 - smoothstep(-0.035,0.045,lane)) * smoothstep(0.0,1.9,dune*3.0));
      float waterfront = abs(p.y - (shore - 10.3 - 1.1*sin(p.x*0.072)));
      float sharedPath = min(waterfront - 1.3, max(abs(p.x - 13.0) - 1.24, max(-p.y - 1.0, p.y - shore + 8.2)));
      vec2 flag = p*vec2(1.22, 1.85);
      flag.x += 0.5*mod(floor(flag.y),2.0);
      vec2 flagEdge = min(fract(flag), 1.0 - fract(flag));
      float flagMask = smoothstep(0.016, 0.054 + filterWidth, min(flagEdge.x,flagEdge.y));
      vec3 flagstone = vec3(0.282,0.260,0.214) * (0.83 + flagMask*0.26 + clutter*0.22 + soilHash(floor(flag))*0.23);
      ground = mix(ground, flagstone, (1.0 - smoothstep(-0.15,0.14,sharedPath)) * (0.82 + 0.18*dune));
      diffuseColor.rgb *= ground;
    `);
  };
  const columns = 150;
  const rows = 108;
  const vertices = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    const z = -145 + row * 1.78;
    for (let column = 0; column <= columns; column++) {
      const x = -150 + column * 2;
      vertices.push(x, groundHeight(x, z), z);
      if (column < columns && row < rows) {
        const index = row * (columns + 1) + column;
        indices.push(index, index + columns + 1, index + 1, index + 1, index + columns + 1, index + columns + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, material);
  ground.name = 'Badaguan terrain';
  ground.receiveShadow = true;
  return ground;
}

function seedRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function crownGeometry(frequency, ruggedness, detail = 2) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const { position } = geometry.attributes;
  const colors = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const ridges = Math.sin(x * frequency + z * 4) * Math.cos(y * 8 - z * frequency);
    const radius = 1 + ridges * ruggedness + Math.sin(z * 13 + x * 7) * 0.046;
    position.setXYZ(i, x * radius, y * radius, z * radius);
    const brightness = 0.86 + y * 0.12 + ridges * 0.095 + Math.sin(z * 15 + y * 9) * 0.055;
    colors.push(brightness, brightness, brightness * 0.986);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function textureCrown(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCrown;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrown = (instanceMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCrown;
      float crownHash(vec3 point) {
        point = fract(point * 0.1173);
        point += dot(point, point.yzx + 19.19);
        return fract((point.x + point.y) * point.z);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec3 p = vCrown * vec3(1.05, 0.88, 1.09);
      vec3 clusters = vec3(sin(p.x*12.1+p.y*5.0), sin(p.y*11.0-p.z*8.2), sin(p.z*8.0+p.x*3.9));
      float gaps = smoothstep(0.55, 1.56, dot(clusters, clusters)*0.54);
      vec3 leaf = p*16.0 + clusters*0.35;
      float stipple = crownHash(floor(leaf) + floor(leaf.yzx*0.09));
      float width = max(length(dFdx(leaf)), length(dFdy(leaf)));
      float grain = mix(stipple, 0.5, smoothstep(0.42, 1.5, width));
      float lightFlecks = smoothstep(0.55, 0.85, grain) * (1.0 - gaps*0.60);
      diffuseColor.rgb *= (0.78 + gaps*0.25 + grain*0.30);
      diffuseColor.rgb += diffuseColor.rgb * vec3(0.40, 0.29, 0.08) * lightFlecks;
    `);
  };
}

function leafSprayTexture() {
  const random = seedRandom(85041);
  const size = 256;
  const bytes = new Uint8Array(size * size * 4);
  for (let i = 0; i < 288; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (0.83 + Math.sin(angle*5.0)*0.10);
    const x = size*(0.5 + Math.cos(angle) * radius * 0.5);
    const y = size*(0.5 + Math.sin(angle) * radius * 0.5);
    const length = 2.8 + 6 * random();
    const width = length * (0.47 + 0.17 * random());
    const orientation = angle + (random() - 0.5) * 2.7;
    const cos = Math.cos(orientation);
    const sin = Math.sin(orientation);
    const tint = 196 + random() * 54;
    const extent = Math.ceil(length);
    for (let row = Math.max(0, Math.floor(y) - extent); row <= Math.min(size - 1, Math.ceil(y) + extent); row++) {
      for (let col = Math.max(0, Math.floor(x) - extent); col <= Math.min(size - 1, Math.ceil(x) + extent); col++) {
        const dx = col - x;
        const dy = row - y;
        const u = (dx*cos + dy*sin) / length;
        const v = (dy*cos - dx*sin) / width;
        const shape = Math.abs(u) + v*v*0.81;
        if (shape >= 1.04) continue;
        const brightness = tint - v*15 + (Math.abs(v) < 0.10 ? 7 : 0);
        const index = (row*size + col)*4;
        bytes[index] = brightness;
        bytes[index+1] = brightness;
        bytes[index+2] = brightness*0.95;
        bytes[index+3] = Math.max(bytes[index+3], Math.round(Math.min((1.04-shape)*860, 255)));
      }
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function leafSprayGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const point = new THREE.Vector3();
  const corners = [
    [-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1],
    [-1, -1, 0, 0], [1, 1, 1, 1], [-1, 1, 0, 1],
  ];
  for (const [yaw, tilt] of [[0, 0.29], [Math.PI * 0.33, 1.05], [Math.PI * 0.69, -0.87]]) {
    const angle = new THREE.Euler(tilt, yaw, 0, 'YXZ');
    for (const [x, y, u, v] of corners) {
      point.set(x, y, 0).applyEuler(angle);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function makeBarkTexture(pale) {
  const random = seedRandom(pale ? 1768 : 122);
  const size = 96;
  const bytes = new Uint8Array(size * size * 4);
  const strips = Array.from({ length: size }, () => random());
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const shift = (x + Math.floor(Math.sin(y * 0.072 + x * 0.12) * 2.8) + size) % size;
      const groove = strips[shift];
      const patch = Math.sin(x * 0.22 + Math.sin(y * 0.14)) * Math.cos(y * 0.24 + Math.sin(x * 0.17));
      const shade = pale ? 144 + patch * 37 + groove * 24 : 66 + patch * 13 + groove * 48;
      const index = (y * size + x) * 4;
      const grit = (random() - 0.5) * 22;
      bytes[index] = shade + grit + (pale ? 8 : 13);
      bytes[index + 1] = shade + grit + (pale ? 4 : -1);
      bytes[index + 2] = shade + grit - 14;
      bytes[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function bladeGeometry() {
  const random = seedRandom(512);
  const vertices = [];
  const colors = [];
  for (let blade = 0; blade < 9; blade++) {
    const angle = random() * Math.PI * 2;
    const x = (random() - 0.5) * 0.38;
    const z = (random() - 0.5) * 0.38;
    const height = 0.23 + random() * 0.31;
    const width = 0.018 + random() * 0.023;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    vertices.push(
      x - dx * width, 0, z - dz * width,
      x + dx * width, 0, z + dz * width,
      x + dx * width * 0.64 - dz * 0.10, height * 0.52, z + dz * width * 0.64 + dx * 0.10,
      x - dx * width, 0, z - dz * width,
      x + dx * width * 0.64 - dz * 0.10, height * 0.52, z + dz * width * 0.64 + dx * 0.10,
      x - dx * width * 0.40 - dz * 0.10, height * 0.54, z - dz * width * 0.40 + dx * 0.10,
      x - dx * width * 0.40 - dz * 0.10, height * 0.54, z - dz * width * 0.40 + dx * 0.10,
      x + dx * width * 0.64 - dz * 0.10, height * 0.52, z + dz * width * 0.64 + dx * 0.10,
      x - dz * 0.23, height, z + dx * 0.23,
    );
    for (const light of [0.61, 0.63, 0.76, 0.61, 0.76, 0.83, 0.83, 0.76, 0.99]) {
      colors.push(light, light, light * 0.91);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function leafGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -0.048, -0.061, 0.002, 0.006, -0.034, 0.002, 0.05,
    0, 0, -0.048, -0.034, 0.002, 0.05, 0, 0.017, 0.063,
    0, 0, -0.048, 0, 0.017, 0.063, 0.043, 0.002, 0.05,
    0, 0, -0.048, 0.043, 0.002, 0.05, 0.062, 0.002, 0.009,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function sign(scene, x, z, rotation, title, romanization, box) {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 182;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#1e5269';
  context.fillRect(0, 0, 512, 182);
  context.strokeStyle = '#d0d4bd';
  context.lineWidth = 4;
  context.strokeRect(11, 11, 490, 160);
  context.fillStyle = '#eeeade';
  context.font = 'bold 72px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText(title, 256, 93);
  context.font = '30px system-ui, sans-serif';
  context.fillText(romanization, 256, 140);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.62),
    new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }));
  const y = groundHeight(x, z);
  label.position.set(x, y + 2.28, z);
  label.rotation.y = rotation;
  scene.add(label);
  box(x, y + 0.96, z, 0.075, 2.02, 0.075, 0x55594c);
}

export function createLandscape(scene) {
  scene.add(makeTerrain());
  const random = seedRandom(80378);
  const pick = (values) => values[Math.floor(random() * values.length)];
  const range = (min, max) => min + (max - min) * random();
  const colliders = [];
  const addCollider = (minX, maxX, minZ, maxZ) => colliders.push({ minX, maxX, minZ, maxZ });
  const scatter = [];
  const pools = [];
  const windTime = { value: 0 };

  function pool(name, geometry, settings, castShadow = true) {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.89, ...settings });
    const group = { name, geometry, material, castShadow, models: [] };
    pools.push(group);
    return group;
  }

  const cube = pool('Garden masonry and ironwork', new THREE.BoxGeometry(1, 1, 1));
  const timber = pool('Railings and posts', new THREE.CylinderGeometry(0.89, 1, 1, 8));
  const planeBark = pool('Dappled plane tree bark', new THREE.CylinderGeometry(0.71, 1, 1, 10),
    { map: makeBarkTexture(true) });
  const cedarBark = pool('Cedar bark', new THREE.CylinderGeometry(0.62, 1, 1, 9),
    { map: makeBarkTexture(false) });
  const whitewash = pool('Whitewashed trunks', new THREE.CylinderGeometry(0.85, 1, 1, 10));
  const foliage = [
    pool('Broadleaf interior canopies', crownGeometry(6.9, 0.115), { vertexColors: true }),
    pool('Broadleaf irregular canopies', crownGeometry(10.5, 0.132), { vertexColors: true }),
  ];
  const remoteFoliage = pool('Distant tree foliage', crownGeometry(7.7, 0.105, 1), { vertexColors: true });
  const coniferFoliage = pool('Layered cedar sprays', crownGeometry(11, 0.124, 1), { vertexColors: true });
  for (const group of [...foliage, remoteFoliage, coniferFoliage]) textureCrown(group.material);
  const sprays = pool('Open leaf silhouettes', leafSprayGeometry(), {
    map: leafSprayTexture(), alphaTest: 0.36, side: THREE.DoubleSide, roughness: 0.94,
  }, false);
  const shrubs = pool('Coastal shrub foliage', crownGeometry(17.4, 0.27), { vertexColors: true }, false);
  const rocky = pool('Granite coastline', crownGeometry(5, 0.23), { vertexColors: true });
  const leaves = pool('Fallen autumn leaves', leafGeometry(), { side: THREE.DoubleSide }, false);
  const blades = pool('Grasses', bladeGeometry(), { side: THREE.DoubleSide, vertexColors: true }, false);
  blades.material.onBeforeCompile = (shader) => {
    shader.uniforms.landscapeTime = windTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float landscapeTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float sway = sin(landscapeTime*1.55 + instanceMatrix[3].x*0.45 + instanceMatrix[3].z*0.82);
        transformed.x += sway * transformed.y * transformed.y * 0.52;
        transformed.z += sway * transformed.y * 0.085;
      `);
  };
  const lantern = pool('Warm lamp glass', new THREE.CylinderGeometry(0.19, 0.125, 0.32, 6), {
    color: 0xf3bf74, emissive: 0xb66a18, emissiveIntensity: 0.31, roughness: 0.33,
  }, false);

  const up = new THREE.Vector3(0, 1, 0);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const direction = new THREE.Vector3();
  const transform = new THREE.Matrix4();

  function place(group, x, y, z, sx, sy, sz, tint, yaw = 0) {
    rotation.setFromAxisAngle(up, yaw);
    center.set(x, y, z);
    size.set(sx, sy, sz);
    group.models.push([transform.compose(center, rotation, size).clone(), tint]);
  }

  function box(x, y, z, sx, sy, sz, tint, yaw = 0) {
    place(cube, x, y, z, sx, sy, sz, tint, yaw);
  }

  function link(group, a, b, width, tint) {
    direction.subVectors(b, a);
    const length = direction.length();
    rotation.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
    center.lerpVectors(a, b, 0.5);
    size.set(width, length, width);
    group.models.push([transform.compose(center, rotation, size).clone(), tint]);
  }

  const treeColors = {
    plane: [0x5b7032, 0x647b38, 0x73833b, 0x839143, 0x899241, 0x9b8d3e, 0xa3923d, 0x937531],
    ginkgo: [0x859141, 0xa59c3b, 0xb8a73c, 0xc5a83a, 0xd8ac38, 0xdab440, 0xcf9736, 0xa78438],
    cedar: [0x324c35, 0x38543a, 0x3d593b, 0x44613e, 0x506740, 0x586f44],
    grove: [0x495d2d, 0x4e6937, 0x566d33, 0x687a38, 0x738044, 0x819148, 0x7f8439],
  };
  const occupied = [
    [16, 34, -4, 9], [-36, -20, -61, -46],
    [-43, -25, -30, -15], [0, 14, -28, -16], [22, 37, -63, -49],
    [-36, -22, -90, -78], [-4, 10, -96, -84],
  ];

  function insidePlot(x, z, margin = 0) {
    return occupied.some(([left, right, front, back]) =>
      x >= left - margin && x <= right + margin && z >= front - margin && z <= back + margin);
  }

  function tree(x, z, height, species, detailed = true) {
    if (insidePlot(x, z, 0.5) || scatter.some((position) => Math.hypot(position.x - x, position.z - z) < 3.8)) return;
    const y = groundHeight(x,z) - 0.035;
    const trunkRadius = height * range(0.026, 0.037);
    const isCedar = species === 'cedar';
    const useSprays = detailed && !isCedar && (species !== 'grove' || (z > -31 && x > -44 && x < 50));
    const bark = isCedar ? cedarBark : planeBark;
    const branchTint = isCedar ? 0x9a8872 : 0xe0dcc5;
    const palette = treeColors[species];
    const wind = range(-0.36, 0.68);
    const root = new THREE.Vector3(x, y, z);
    const base = new THREE.Vector3(x + wind * 0.24, y + height * 0.116, z + 0.02);
    const joint = new THREE.Vector3(x + wind * 0.75, y + height * (isCedar ? 0.49 : 0.42), z + range(-0.19, 0.34));
    const leader = new THREE.Vector3(x + wind * 1.66, y + height * (isCedar ? 0.94 : 0.85), z + range(-0.42, 0.46));
    if (species === 'plane' || species === 'ginkgo') link(whitewash, root, base, trunkRadius, 0xd3cfb6);
    else link(bark, root, base, trunkRadius, branchTint);
    link(bark, base, joint, trunkRadius * 0.80, branchTint);
    link(bark, joint, leader, trunkRadius * (isCedar ? 0.60 : 0.49), branchTint);
    const startAngle = range(0, Math.PI * 2);
    const boughs = isCedar ? 13 : detailed ? 6 : 4;
    for (let i = 0; i < boughs; i++) {
      const angle = startAngle + i * (isCedar ? 2.39 : 6.283 / boughs) + range(-0.28, 0.28);
      const spread = isCedar ? height * (0.31 - i * 0.013) : height * range(0.18, 0.36);
      const ratio = isCedar ? i / (boughs + 0.4) : range(-0.03, 0.40);
      const fork = new THREE.Vector3().lerpVectors(joint, leader, ratio);
      const elbow = new THREE.Vector3(fork.x + Math.cos(angle) * spread * 0.65,
        fork.y + height * range(0.050, isCedar ? 0.085 : 0.21), fork.z + Math.sin(angle) * spread * 0.65);
      const end = new THREE.Vector3(fork.x + Math.cos(angle) * spread,
        elbow.y + height * range(0.014, isCedar ? 0.035 : 0.16), fork.z + Math.sin(angle) * spread);
      if (detailed) {
        link(bark, fork, elbow, trunkRadius * (1 - ratio * 0.40) * (isCedar ? 0.27 : 0.45), branchTint);
        link(bark, elbow, end, trunkRadius * 0.21, branchTint);
      }
      const crownScale = height * (isCedar ? range(0.105, 0.18) * (1.1 - ratio * 0.47) : range(0.115, 0.179));
      const detailedCrown = pick(foliage);
      const crown = isCedar ? coniferFoliage : detailed ? detailedCrown : remoteFoliage;
      const crownDepth = crownScale * (isCedar ? 0.39 : range(0.83, 1.33));
      const crownWidth = crownScale * range(0.78, 1.10);
      const crownTint = pick(palette);
      const crownHeight = end.y + crownScale * 0.18;
      place(crown, end.x, crownHeight, end.z, crownScale * (isCedar ? 1.50 : 1.14),
        crownDepth, crownWidth, crownTint, angle);
      if (useSprays) {
        place(sprays, end.x, crownHeight + crownScale*0.28, end.z,
          crownScale*1.57, crownScale*1.43, crownScale*1.65, crownTint, angle + 0.73);
        place(sprays, end.x + Math.cos(angle)*crownScale*0.52, crownHeight - crownScale*0.28,
          end.z + Math.sin(angle)*crownScale*0.52,
          crownScale*1.01, crownScale*0.73, crownScale*1.08, crownTint, angle + 1.43);
      }
      for (let j = 0; j < (detailed ? 3 : 1); j++) {
        const leafAngle = angle + j * 2.3 + range(-0.4, 0.4);
        const distance = crownScale * range(0.52, 1.15);
        const leafX = end.x + Math.cos(leafAngle) * distance;
        const leafZ = end.z + Math.sin(leafAngle) * distance;
        const leafY = end.y + crownScale * range(-0.18, isCedar ? 0.36 : 0.87);
        if (detailed && !isCedar && j === 0) {
          link(bark, elbow, new THREE.Vector3(leafX, leafY, leafZ), trunkRadius * 0.135, branchTint);
        }
        const dimensions = crownScale * range(0.37, 0.68);
        const leafCrown = pick(foliage);
        const leafTint = pick(palette);
        place(isCedar ? coniferFoliage : detailed ? leafCrown : remoteFoliage, leafX, leafY, leafZ,
          dimensions * (isCedar ? 1.38 : 1), dimensions * (isCedar ? 0.40 : 1.05), dimensions, leafTint, leafAngle);
        if (useSprays) place(sprays, leafX, leafY, leafZ,
          dimensions*1.75, dimensions*1.52, dimensions*1.69, leafTint, leafAngle + 0.43);
      }
    }
    for (let i = 0; i < (detailed ? 4 : 2); i++) {
      const angle = startAngle + i * 2.4;
      const span = height * (isCedar ? 0.085 : 0.17);
      const scale = span * range(0.68, 1.10);
      const detailedCrown = pick(foliage);
      const crown = isCedar ? coniferFoliage : detailed ? detailedCrown : remoteFoliage;
      const topX = leader.x + Math.cos(angle) * span * 0.64;
      const topY = leader.y + span * range(-0.39, 0.45);
      const topZ = leader.z + Math.sin(angle) * span * 0.61;
      const tint = pick(palette);
      place(crown, topX, topY, topZ, scale * 1.12, scale, scale, tint, angle);
      if (useSprays) place(sprays, topX, topY, topZ, scale*1.49, scale*1.42, scale*1.5, tint, angle + 0.23);
    }
    const radius = trunkRadius * 0.92;
    addCollider(x - radius, x + radius, z - radius, z + radius);
    scatter.push({ x, z, species });
  }

  const street = [
    [-62, -11, 9.4], [-54, -0.3, 10.3], [-48, -11, 11.3], [-41, -0.8, 9.4],
    [-33, -10.9, 10.7], [-28, -0.2, 10.1], [-21, -12.3, 9.2], [-18.2, 0.3, 11.2],
    [-6.8, -14.4, 10.6], [-4.7, 0.5, 9.6], [0.8, -13.2, 10.2], [3.4, 2.6, 8.8],
    [11.5, -11.4, 9.3], [23.5, -12.7, 10.9], [34.6, -12.2, 10.2], [43.8, -10.4, 9.6],
    [52.1, -1.2, 9.3], [56.6, -11.4, 10.9], [63.6, -0.6, 10.8], [67.6, -11.2, 12.2],
  ];
  for (const [x, z, height] of street) tree(x, z, height, 'plane');

  for (const zCenter of EAST_WEST) {
    for (let x = -71; x < 73; x += 1.12) {
      for (const side of [-1, 1]) {
        if (NORTH_SOUTH.some((lane) => Math.abs(x - lane - laneBend(zCenter)) < 4.05)) continue;
        const z = zCenter + roadBend(x) + side * 2.79;
        const slope = roadBend(x + 0.55) - roadBend(x - 0.55);
        box(x, groundHeight(x, z) + 0.026, z, 1.09, 0.087, 0.136,
          pick([0xa49d87, 0x9b9580, 0x93917f, 0xa09b8b]), -Math.atan2(slope, 1.10));
      }
    }
  }
  for (let x = -68; x < 71; x += 6.8) {
    for (const side of [-1, 1]) {
      const variation = range(-0.80, 0.80);
      const z = -43 + roadBend(x) + side * 4.95 + variation;
      if (roadDistance(x, z) > 1.72) tree(x + variation, z, range(7.7, 11.4), 'ginkgo');
    }
  }
  for (let z = -102; z < -17; z += 8.2) {
    for (const side of [-1, 1]) {
      const variation = range(-0.85, 0.85);
      const x = 40 + laneBend(z) + side * 4.25 + variation;
      if (roadDistance(x, z) > 1.65) tree(x, z + variation, range(8.0, 12.9), 'cedar');
    }
  }
  for (const position of [[6.8, 10], [21, 11.2], [35.8, 9], [42.7, 2.5], [45.5, 11.3], [61, 8], [64, 16], [-29, 6.8], [-44, 8]]) {
    tree(...position, range(6.6, 9.8), 'cedar');
  }
  for (let i = 0; i < 470; i++) {
    const x = range(-120, 120);
    const z = range(-133, 8);
    if (roadDistance(x, z) < 2.15 || (z > -17 && x > -19 && x < 47) || Math.abs(z - promenadeZ(x)) < 2.2) continue;
    if (random() < (z < -83 || Math.abs(x) > 69 ? 0.83 : 0.42)) {
      tree(x, z, range(6, 13), random() < 0.21 ? 'cedar' : 'grove', Math.abs(x) < 70 && z > -86);
    }
  }

  function hedge(x, z, width, angle = 0, scale = 1) {
    for (let step = -width / 2; step < width / 2; step += 0.49) {
      const bx = x + Math.cos(angle) * step + range(-0.09, 0.09);
      const bz = z + Math.sin(angle) * step + range(-0.09, 0.09);
      const ground = groundHeight(bx, bz);
      const radius = range(0.55, 0.82) * scale;
      place(shrubs, bx, ground + radius * 0.67, bz, radius, radius * range(0.70, 1.04), radius * 0.94,
        pick([0x4b6032, 0x546636, 0x596d37, 0x69733c, 0x737642]), range(0, 6.3));
    }
  }

  function fence(x1, z1, x2, z2, brick = false) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const ux = (x2 - x1) / length;
    const uz = (z2 - z1) / length;
    const angle = -Math.atan2(uz, ux);
    const spans = Math.max(1, Math.round(length / 2.65));
    const span = length / spans;
    const steel = 0x383a30;
    for (let i = 0; i <= spans; i++) {
      const x = x1 + ux * i * span;
      const z = z1 + uz * i * span;
      const y = groundHeight(x, z);
      box(x, y + 0.50, z, 0.37, 1, 0.37, brick ? 0x885d49 : 0x8c8170, angle);
      box(x, y + 1.03, z, 0.47, 0.14, 0.47, brick ? 0x9e7d61 : 0xa99a83, angle);
      if (i === spans) continue;
      const cx = x + ux * span * 0.5;
      const cz = z + uz * span * 0.5;
      const level = groundHeight(cx, cz);
      box(cx, level + 0.17, cz, span + 0.02, 0.36, 0.29, brick ? 0x79503f : 0x8c8271, angle);
      box(cx, level + 0.365, cz, span + 0.02, 0.10, 0.34, brick ? 0xa38469 : 0x9e927e, angle);
      for (let row = 0; row < 2; row++) {
        for (let d = 0.24 + row * 0.10; d < span - 0.18; d += 0.29) {
          const px = x + ux * d;
          const pz = z + uz * d;
          const colors = brick ? [0x89634d, 0xa07259, 0x714d3c, 0x955d45] : [0x766d61, 0x9f8d73, 0x8f8171, 0xaa9a83];
          box(px, level + 0.12 + row * 0.145, pz, 0.278, 0.128, 0.303, pick(colors), angle);
        }
      }
      for (const elevation of [0.54, 0.924]) box(cx, level + elevation, cz, span, 0.045, 0.051, steel, angle);
      for (let d = 0.24; d < span - 0.21; d += 0.15) {
        const px = x + ux * d;
        const pz = z + uz * d;
        box(px, level + 0.73, pz, 0.025, 0.64, 0.025, steel);
        box(px, level + 1.05, pz, 0.056, 0.056, 0.056, 0x49453a, angle + 0.785);
      }
      const mx = x + ux * span;
      const mz = z + uz * span;
      addCollider(Math.min(x, mx) - 0.16, Math.max(x, mx) + 0.16,
        Math.min(z, mz) - 0.16, Math.max(z, mz) + 0.16);
    }
  }

  fence(-44, -14.8, -34, -14.8, true);
  fence(-30.4, -14.8, -25.6, -14.8, true);
  fence(-44, -32, -44, -14.8, true);
  fence(-44, -32, -25.6, -32, true);
  fence(-1.8, -14.8, 4.8, -14.8, true);
  fence(9.2, -14.8, 13.0, -14.8, true);
  fence(-1.8, -28, -1.8, -14.8, true);
  fence(-37.9, -47.3, -31.2, -47.3, true);
  fence(-25.3, -47.3, -20, -47.3, true);
  fence(-37.9, -65, -37.9, -47.3, true);
  fence(31.8, -2.8, 36.4, -2.8);
  fence(36.4, -2.8, 36.4, 10.0);
  fence(20.2, 9.8, 36.4, 9.8);
  for (const [left, right] of [[32, 38.8], [38.8, 45.6], [45.6, 52.4], [52.4, 59.0]]) {
    fence(left, promenadeZ(left) + 1.76, right, promenadeZ(right) + 1.76);
  }
  hedge(-36, -15.28, 15, 0, 0.98);
  hedge(-27, -46.03, 10, 0, 0.70);
  hedge(31.6, 10.46, 13, 0, 0.93);
  hedge(37.3, 4.3, 12, Math.PI / 2, 0.84);
  hedge(-4.5, -17.4, 8, Math.PI / 2, 0.84);
  hedge(-3.4, 3.5, 10, 0, 0.58);
  hedge(43.6, -6.2, 8, Math.PI / 2, 0.91);

  for (const [x, z] of [[-21, -10.9], [-6.9, -11.54], [6.5, -10.9], [18.5, -1.2], [35.7, -1.0],
    [49, -9.3], [2, 5], [-41, -48], [-18.5, -47], [-2.6, -47], [24, -48], [53, -39]]) {
    const y = groundHeight(x, z);
    const dark = 0x3b4036;
    place(timber, x, y + 0.17, z, 0.16, 0.34, 0.16, dark);
    place(timber, x, y + 1.58, z, 0.057, 3.02, 0.057, dark);
    place(timber, x, y + 2.91, z, 0.16, 0.20, 0.16, dark);
    place(lantern, x, y + 3.13, z, 1, 1, 1, 0xffffff);
    place(timber, x, y + 3.36, z, 0.24, 0.16, 0.24, dark);
    place(timber, x, y + 3.48, z, 0.07, 0.19, 0.07, dark);
    for (let i = 0; i < 6; i++) {
      const angle = (i + 0.5) * Math.PI / 3;
      const start = new THREE.Vector3(x + Math.cos(angle) * 0.125, y + 2.99, z + Math.sin(angle) * 0.125);
      const end = new THREE.Vector3(x + Math.cos(angle) * 0.184, y + 3.28, z + Math.sin(angle) * 0.184);
      link(timber, start, end, 0.015, dark);
    }
  }

  for (const [x, z, title, romanization, rotation] of [
    [-10, -13.1, '山海关路', 'SHANHAIGUAN LU', -1.06],
    [-8.8, -46.5, '居庸关路', 'JUYONGGUAN LU', 0.06],
    [18.2, -46.6, '宁武关路', 'NINGWUGUAN LU', Math.PI / 2],
    [44.2, -42.1, '紫荆关路', 'ZIJINGGUAN LU', 0.11],
  ]) sign(scene, x, z, rotation, title, romanization, box);

  for (const x of [-31, -8, 5, 29, 44, 64]) {
    const z = promenadeZ(x) - 2.1;
    const y = groundHeight(x, z);
    for (const dx of [-0.72, 0.72]) {
      box(x + dx, y + 0.22, z, 0.17, 0.44, 0.53, 0x8f826e);
      box(x + dx, y + 0.69, z - 0.24, 0.07, 0.63, 0.08, 0x403e34);
    }
    for (let slat = 0; slat < 4; slat++) box(x, y + 0.46, z - 0.19 + slat * 0.116, 1.89, 0.071, 0.103, 0x855737);
    for (let slat = 0; slat < 3; slat++) box(x, y + 0.69 + slat * 0.12, z - 0.24, 1.89, 0.091, 0.068, 0x8b5d3d);
    addCollider(x - 0.91, x + 0.91, z - 0.22, z + 0.22);
  }

  for (let i = 0; i < 275; i++) {
    const x = range(20, 74);
    const z = shoreline(x) + range(-3.1, 2.5);
    const radius = range(0.20, 1.95) * (0.52 + random() * 0.52);
    const y = groundHeight(x, z);
    const moss = random() > 0.74;
    const tint = moss ? pick([0x635d44, 0x777052, 0x786652]) : pick([0x84715f, 0x937759, 0xa18161, 0x6e635a, 0x948472]);
    place(rocky, x, y - radius * 0.10, z, radius, radius * range(0.34, 0.67), radius * range(0.58, 1.22), tint, range(0, 6.3));
  }

  const grassColors = [0x52632f, 0x63733a, 0x747a37, 0x858348, 0x8d8451, 0xa49b5e];
  for (let i = 0; i < 5600; i++) {
    const close = i < 2100;
    const x = close ? range(-34, 54) : range(-105, 105);
    const z = close ? range(-24, shoreline(x) - 5.6) : range(-116, shoreline(x) - 5.6);
    if (roadDistance(x, z) < 1.64 || insidePlot(x, z, 0.10) || Math.abs(z - promenadeZ(x)) < 1.4
      || (Math.abs(x - 13) < 1.25 && z > -1)) continue;
    const patch = Math.sin(x * 0.26 + z * 0.31) * Math.cos(x * 0.20 - z * 0.38);
    if (patch < -0.48 && random() < 0.83) continue;
    const scale = range(0.23, 1.12) * (shoreline(x) - z < 10 ? 1.23 : 0.83);
    const y = groundHeight(x, z);
    place(blades, x, y - 0.022, z, scale, scale, scale, pick(grassColors), range(0, 6.3));
    if (random() > 0.997 && z > -14) place(shrubs, x, y + 0.22, z, 0.60, 0.40, 0.57, pick(grassColors), range(0, 6.3));
  }

  for (const location of scatter) {
    if (!['plane', 'ginkgo'].includes(location.species) || Math.abs(location.x) > 70) continue;
    const palette = location.species === 'ginkgo' ? [0xc28d37, 0xcf9f3d, 0x986f36, 0xb18d3e, 0xd7a436]
      : [0x997237, 0x84683f, 0xa67d3d, 0xbb8b4b, 0xd2a460];
    const count = location.species === 'ginkgo' ? 75 : 43;
    for (let i = 0; i < count; i++) {
      const angle = range(0, Math.PI * 2);
      const distance = Math.sqrt(random()) * range(1.9, 3.45);
      const x = location.x + Math.cos(angle) * distance;
      const z = location.z + Math.sin(angle) * distance;
      const size = range(0.37, 0.95);
      place(leaves, x, groundHeight(x, z) + 0.028, z, size, size, size, pick(palette), angle);
    }
  }

  const color = new THREE.Color();
  for (const { name, geometry, material, castShadow, models } of pools) {
    if (!models.length) continue;
    const mesh = new THREE.InstancedMesh(geometry, material, models.length);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    for (let i = 0; i < models.length; i++) {
      const [matrix, tint] = models[i];
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.setHex(tint));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  return {
    height: groundHeight,
    shoreline,
    bounds,
    colliders,
    addCollider,
    update(time) { windTime.value = time; },
  };
}
