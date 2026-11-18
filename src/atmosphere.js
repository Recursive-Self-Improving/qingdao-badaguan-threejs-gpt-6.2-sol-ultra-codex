import * as THREE from 'three'

const presets = {
  golden: {
    sky: '#81a3b8', mist: '#d9b9a6', horizon: '#edd4b7',
    cloud: '#b69fa7', cloudLight: '#fff0d3', sunlight: '#ffdfa8',
    sea: '#4c767a', shallows: '#79a19e', land: '#687b79',
    ambientSky: '#e0eefa', ambientGround: '#a49773',
    sun: [-0.82, 0.28, 0.50], direct: 2.5, fill: 2.0,
  },
  day: {
    sky: '#6d9fbf', mist: '#acc3ca', horizon: '#d9e2da',
    cloud: '#aebec8', cloudLight: '#edf1e8', sunlight: '#fff0d2',
    sea: '#387d8b', shallows: '#74b3ad', land: '#537881',
    ambientSky: '#dfedff', ambientGround: '#a99d86',
    sun: [-0.67, 0.84, 0.48], direct: 2.8, fill: 2.4,
  },
  dusk: {
    sky: '#46587b', mist: '#8a788d', horizon: '#c5a29c',
    cloud: '#746d85', cloudLight: '#d7a99e', sunlight: '#f6b08b',
    sea: '#344e66', shallows: '#547a88', land: '#4e5a6d',
    ambientSky: '#a3bcec', ambientGround: '#877578',
    sun: [-0.87, 0.10, 0.48], direct: 1.35, fill: 1.55,
  },
}

const colorKeys = [
  'sky', 'mist', 'horizon', 'cloud', 'cloudLight', 'sunlight',
  'sea', 'shallows', 'land', 'ambientSky', 'ambientGround',
]
const shoreWidth = 310

const noiseSource = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float cloudNoise(vec2 p) {
    mat2 rotation = mat2(0.86, -0.51, 0.51, 0.86);
    float sum = noise(p) * 0.54;
    p = rotation * p * 2.03 + 5.0;
    sum += noise(p) * 0.26;
    p = rotation * p * 2.05 + 7.0;
    sum += noise(p) * 0.13;
    return sum + noise(rotation * p * 2.07) * 0.07;
  }
`

const skyVertex = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    gl_Position = clip.xyww;
  }
`

const skyFragment = /* glsl */ `
  uniform vec3 uSky;
  uniform vec3 uMist;
  uniform vec3 uHorizon;
  uniform vec3 uCloud;
  uniform vec3 uCloudLight;
  uniform vec3 uSunlight;
  uniform vec3 uSunDirection;
  uniform float uTime;
  varying vec3 vDirection;

  ${noiseSource}

  void main() {
    vec3 dir = normalize(vDirection);
    float height = max(dir.y, 0.0);
    float sun = clamp(dot(dir, uSunDirection), 0.0, 1.0);
    vec3 color = mix(uHorizon, uMist, smoothstep(0.0, 0.17, height));
    color = mix(color, uSky, smoothstep(0.025, 0.62, height));
    color += uSunlight * (pow(sun, 5.0) * 0.12 + pow(sun, 24.0) * 0.18);

    // Two upper-air layers drift at different speeds above the marine haze.
    vec2 low = dir.xz / (height + 0.30);
    vec2 cloudPosition = low * vec2(3.4, 5.4) + vec2(6.1 + uTime * 0.011, -3.7);
    float warp = noise(cloudPosition * 0.52);
    float cloud = cloudNoise(cloudPosition + vec2(warp * 1.2, warp * 0.6));
    float fringe = cloudNoise(cloudPosition + vec2(0.18, -0.16));
    float lit = clamp(0.59 + (cloud - fringe) * 3.7 + sun * 0.23, 0.0, 1.0);
    float cover = smoothstep(0.45, 0.67, cloud);
    cover *= smoothstep(0.018, 0.10, height) * (1.0 - smoothstep(0.54, 0.94, height));
    vec3 cloudTint = mix(uCloud, uCloudLight, lit);
    color = mix(color, cloudTint, cover * 0.76);

    vec2 cirrus = (dir.xz / (height + 0.56)) * vec2(8.0, 22.0);
    cirrus += vec2(-12.7, 5.0 + uTime * 0.015);
    float wisps = smoothstep(0.52, 0.77, cloudNoise(cirrus));
    wisps *= smoothstep(0.08, 0.31, height) * (1.0 - smoothstep(0.74, 1.0, height));
    color = mix(color, uCloudLight, wisps * 0.16);

    float disc = smoothstep(0.99982, 0.99994, sun);
    color += uSunlight * (pow(sun, 180.0) * 0.20 + disc * 0.55);
    color += vec3((hash(gl_FragCoord.xy) - 0.5) * 0.004);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const waterVertex = /* glsl */ `
  varying vec3 vPoint;

  void main() {
    vPoint = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPoint, 1.0);
  }
`

const waterFragment = /* glsl */ `
  uniform vec3 uSea;
  uniform vec3 uShallows;
  uniform vec3 uSky;
  uniform vec3 uHorizon;
  uniform vec3 uSunlight;
  uniform vec3 uSunDirection;
  uniform sampler2D uShore;
  uniform float uTime;
  uniform float uFoamScale;
  varying vec3 vPoint;

  ${noiseSource}

  void main() {
    vec2 p = vPoint.xz;
    vec3 view = cameraPosition - vPoint;
    float distanceToEye = length(view);
    view /= distanceToEye;

    float a = dot(p, vec2(0.31, 0.83)) + uTime * 0.97;
    float b = dot(p, vec2(-0.63, 1.21)) + uTime * 1.26;
    float c = dot(p, vec2(1.32, 2.51)) + uTime * 1.85;
    float d = dot(p, vec2(-3.4, 4.1)) + uTime * 2.93;
    float e = dot(p, vec2(6.0, 8.2)) + uTime * 3.22;
    float smallWaves = 1.0 - smoothstep(35.0, 100.0, distanceToEye);
    vec2 slope = vec2(0.31, 0.83) * cos(a) * 0.074;
    slope += vec2(-0.63, 1.21) * cos(b) * 0.041;
    slope += vec2(1.32, 2.51) * cos(c) * 0.018 * smallWaves;
    slope += vec2(-3.4, 4.1) * cos(d) * 0.008 * smallWaves;
    slope += vec2(6.0, 8.2) * cos(e) * 0.003 * smallWaves;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

    float u = p.x / uFoamScale + 0.5;
    float shoreZ = texture2D(uShore, vec2(clamp(u, 0.0, 1.0), 0.5)).r * 64.0 - 16.0;
    float shoreFade = smoothstep(0.0, 0.055, u) * (1.0 - smoothstep(0.945, 1.0, u));
    float coastDistance = p.y - shoreZ;
    float depth = clamp(coastDistance * 0.065, 0.0, 1.0);
    vec3 base = mix(uSea, uShallows, (1.0 - depth) * shoreFade);
    float swell = sin(a) * 0.51 + sin(b) * 0.29 + sin(c) * 0.12 * smallWaves;
    base *= 0.96 + swell * (0.08 + smallWaves * 0.06);

    vec3 reflected = reflect(-view, normal);
    float grazing = pow(1.0 - clamp(dot(view, normal), 0.0, 1.0), 3.1);
    vec3 reflection = mix(uHorizon, uSky, smoothstep(-0.10, 0.48, reflected.y));
    vec3 color = mix(base, reflection, 0.18 + grazing * 0.46);
    float glitter = pow(max(dot(reflected, uSunDirection), 0.0), 112.0);
    float sheen = pow(max(dot(reflected, uSunDirection), 0.0), 18.0);
    color += uSunlight * (glitter * 0.48 + sheen * 0.10);

    float scallop = noise(vec2(p.x * 0.31, coastDistance * 0.22 + uTime * 0.08));
    float grains = noise(p * vec2(3.5, 5.8) + vec2(0.0, uTime * 0.18));
    float incoming = sin(coastDistance * 2.5 + scallop * 2.1 + uTime * 1.85);
    float wash = smoothstep(0.83, 0.99, incoming) * smoothstep(0.15, 0.77, coastDistance);
    wash *= 1.0 - smoothstep(2.1, 7.0, coastDistance);
    float tide = sin(uTime * 0.64 + p.x * 0.16) * 0.32 + scallop * 0.62;
    float rim = 1.0 - smoothstep(0.05, 0.24, abs(coastDistance - 0.25 - tide));
    float foam = (wash * 0.60 + rim * 0.62) * (0.48 + grains * 0.52) * shoreFade * smallWaves;
    color = mix(color, mix(uHorizon, vec3(0.92, 0.96, 0.90), 0.72), foam);

    float haze = 1.0 - exp(-distanceToEye / 111.0);
    color = mix(color, uHorizon, haze * 0.92);
    color += vec3((hash(gl_FragCoord.xy) - 0.5) * 0.002);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const hillsideVertex = /* glsl */ `
  varying vec3 vPoint;
  varying vec3 vNormal;

  void main() {
    vPoint = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPoint, 1.0);
  }
`

const hillsideFragment = /* glsl */ `
  uniform vec3 uLand;
  uniform vec3 uHorizon;
  uniform vec3 uSunDirection;
  varying vec3 vPoint;
  varying vec3 vNormal;

  ${noiseSource}

  void main() {
    float brightness = 0.75 + max(dot(normalize(vNormal), uSunDirection), 0.0) * 0.16;
    float detail = noise(vPoint.xz * 0.33) * 0.13 + noise(vPoint.xz * 1.38) * 0.03;
    vec3 color = uLand * (brightness + detail);
    color = mix(color * vec3(1.09, 0.96, 0.86), color, smoothstep(0.2, 2.5, vPoint.y));
    float haze = 0.4 + 0.49 * (1.0 - exp(-length(cameraPosition - vPoint) / 190.0));
    haze += 0.08 * (1.0 - smoothstep(0.0, 5.0, vPoint.y));
    gl_FragColor = vec4(mix(color, uHorizon, haze), 1.0);
    #include <colorspace_fragment>
  }
`

function addHeadland(scene, material, x, z, width, depth, elevation, seed) {
  const radialSteps = 48
  const levels = 11
  const positions = [0, elevation * 0.84, 0]
  const indices = []

  for (let ring = 1; ring <= levels; ring++) {
    const radius = ring / levels
    for (let segment = 0; segment < radialSteps; segment++) {
      const angle = segment / radialSteps * Math.PI * 2
      const outline = 1 + Math.sin(angle * 3 + seed) * 0.09 + Math.sin(angle * 7 + seed) * 0.035
      const px = Math.cos(angle) * radius * outline
      const pz = Math.sin(angle) * radius * outline
      const ridges = 0.78 + Math.sin(px * 7 + seed) * 0.12 + Math.cos(pz * 8 - seed) * 0.10
      const slope = Math.pow(Math.sin((1 - radius) * Math.PI / 2), 0.86)
      const height = elevation * ridges * slope - (ring === levels ? 0.24 : 0)
      positions.push(px * width, height, pz * depth)
    }
  }

  for (let segment = 0; segment < radialSteps; segment++) {
    const next = (segment + 1) % radialSteps
    indices.push(0, next + 1, segment + 1)
    for (let ring = 1; ring < levels; ring++) {
      const inner = (ring - 1) * radialSteps + 1
      const outer = inner + radialSteps
      indices.push(inner + segment, outer + next, outer + segment)
      indices.push(inner + segment, inner + next, outer + next)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const headland = new THREE.Mesh(geometry, material)
  headland.position.set(x, 0, z)
  scene.add(headland)
}

function addGulls(scene) {
  const birds = []
  const material = new THREE.MeshBasicMaterial({ color: '#7c7770', side: THREE.DoubleSide })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.24, -0.26, 0.03, 0.035, -0.66, -0.055, -0.13, -0.25, 0, -0.10,
    0, 0, -0.23, 0.26, 0.03, 0.035, 0.66, -0.055, -0.13, 0.25, 0, -0.10,
  ], 3))
  geometry.setIndex([0, 1, 3, 1, 2, 3, 0, 3, 4, 0, 7, 5, 5, 7, 6, 0, 4, 7])

  for (let index = 0; index < 6; index++) {
    const mesh = new THREE.Mesh(geometry.clone(), material)
    mesh.frustumCulled = false
    mesh.scale.setScalar(0.72 + (index % 3) * 0.09)
    scene.add(mesh)
    birds.push(mesh)
  }

  return (time) => {
    for (let index = 0; index < birds.length; index++) {
      const bird = birds[index]
      const angle = time * (0.083 + (index % 2) * 0.008) + index * 0.39 + 0.64
      const radius = 23 + index * 2.6
      bird.position.set(26 + Math.cos(angle) * radius, 11.6 + index * 1.06 + Math.sin(angle * 2.0) * 2.2, 60 + Math.sin(angle) * radius * 0.62)
      bird.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * 0.62)
      bird.rotation.z = -0.21 + Math.sin(angle * 2.0) * 0.17
      const flap = Math.pow(Math.max(0, Math.sin(time * 0.74 + index * 1.74)), 2)
      const wingHeight = -0.025 + Math.sin(time * 13 + index * 2) * 0.29 * flap
      const vertices = bird.geometry.attributes.position
      vertices.setY(1, 0.03 + wingHeight * 0.34)
      vertices.setY(2, wingHeight)
      vertices.setY(5, 0.03 + wingHeight * 0.34)
      vertices.setY(6, wingHeight)
      vertices.needsUpdate = true
    }
  }
}

function createShoreTexture(world) {
  const samples = 1024
  const contour = new Uint8Array(samples)
  for (let index = 0; index < samples; index++) {
    const x = ((index + 0.5) / samples - 0.5) * shoreWidth
    const z = world.shoreline?.(x) ?? 25
    contour[index] = Math.round(THREE.MathUtils.clamp((z + 16) / 64, 0, 1) * 255)
  }
  const texture = new THREE.DataTexture(contour, samples, 1, THREE.RedFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createAtmosphere(scene, world) {
  const values = Object.fromEntries(colorKeys.map((key) => [key, new THREE.Color(presets.golden[key])]))
  const sunDirection = new THREE.Vector3(...presets.golden.sun).normalize()
  const uniforms = {
    uSky: { value: values.sky },
    uMist: { value: values.mist },
    uHorizon: { value: values.horizon },
    uCloud: { value: values.cloud },
    uCloudLight: { value: values.cloudLight },
    uSunlight: { value: values.sunlight },
    uSea: { value: values.sea },
    uShallows: { value: values.shallows },
    uLand: { value: values.land },
    uSunDirection: { value: sunDirection },
    uTime: { value: 0 },
    uShore: { value: createShoreTexture(world) },
    uFoamScale: { value: shoreWidth },
  }

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 44, 28), new THREE.ShaderMaterial({
    uniforms, vertexShader: skyVertex, fragmentShader: skyFragment,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  }))
  sky.name = 'Marine sky'
  sky.frustumCulled = false
  sky.renderOrder = -1000
  scene.add(sky)

  const water = new THREE.Mesh(new THREE.PlaneGeometry(1900, 1500), new THREE.ShaderMaterial({
    uniforms, vertexShader: waterVertex, fragmentShader: waterFragment, toneMapped: false,
  }))
  water.name = 'Taiping Bay'
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0, 390)
  scene.add(water)

  const hillside = new THREE.ShaderMaterial({
    uniforms, vertexShader: hillsideVertex, fragmentShader: hillsideFragment, toneMapped: false,
  })
  addHeadland(scene, hillside, 243, 41, 104, 37, 15.4, 1.4)
  addHeadland(scene, hillside, -207, 56, 82, 47, 20.2, 4.1)
  addHeadland(scene, hillside, 201, 181, 51, 22, 9.8, 2.8)
  const updateGulls = addGulls(scene)

  scene.fog = new THREE.Fog(values.horizon, 36, 210)
  const sun = new THREE.DirectionalLight(values.sunlight, presets.golden.direct)
  const skyFill = new THREE.HemisphereLight(values.ambientSky, values.ambientGround, presets.golden.fill)

  sun.target.position.set(6, 0, -13)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { near: 2, far: 188, left: -65, right: 65, top: 65, bottom: -65 })
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.normalBias = 0.046
  sun.shadow.bias = -0.00019
  sun.shadow.radius = 2
  scene.add(sun, sun.target, skyFill)

  function setMode(mode) {
    if (!Object.hasOwn(presets, mode)) return
    const preset = presets[mode]
    for (const key of colorKeys) values[key].set(preset[key])
    sunDirection.set(...preset.sun).normalize()
    scene.fog.color.copy(values.horizon)
    sun.color.copy(values.sunlight)
    sun.position.copy(sun.target.position).addScaledVector(sunDirection, 99)
    sun.intensity = preset.direct
    skyFill.color.copy(values.ambientSky)
    skyFill.groundColor.copy(values.ambientGround)
    skyFill.intensity = preset.fill
  }

  function update(time) {
    uniforms.uTime.value = time
    updateGulls(time)
  }

  setMode('golden')
  update(0)
  return { setMode, update }
}
