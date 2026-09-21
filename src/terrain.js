import * as THREE from 'three';
import {
  MAP, MAP_W, MAP_H, CONTOUR_STEP, TERRACE_STEP,
  project, unproject, sceneY, clamp, lerp, smoothstep,
} from './config.js';

/* ------------------------------------------------------------------ */
/* Ruido determinista (value noise + fbm + ridged)                     */
/* ------------------------------------------------------------------ */

function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5; freq *= 2.02;
  }
  return sum / norm;
}

function ridged(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(2 * vnoise(x * freq, y * freq) - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= 0.5; freq *= 2.07;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ */
/* Modelo de relieve de Cali                                            */
/* ------------------------------------------------------------------ */

// Cerros con nombre, modelados como gaussianas sobre el valle.
const CERROS = [
  { lon: -76.5470, lat: 3.4707, h: 430, rx: 0.013, ry: 0.017 }, // Tres Cruces
  { lon: -76.5660, lat: 3.4185, h: 330, rx: 0.014, ry: 0.015 }, // Cristo Rey
  { lon: -76.5592, lat: 3.4470, h: 300, rx: 0.012, ry: 0.014 }, // Cerro de la Bandera
  { lon: -76.5720, lat: 3.3760, h: 380, rx: 0.018, ry: 0.020 }, // lomas de Pance
  { lon: -76.5530, lat: 3.4980, h: 260, rx: 0.014, ry: 0.016 }, // Menga / norte
];

/** Altitud en metros sobre el nivel del mar. */
export function elevationM(lon, lat) {
  // El piedemonte (frente montañoso) ondula de norte a sur.
  const front =
    -76.5565 +
    0.0095 * Math.sin((lat - 3.30) * 26.0) +
    0.0045 * Math.sin((lat - 3.30) * 63.0);

  // Valle del Cauca: casi plano, con leve pendiente hacia el este.
  let e = 968 + (-76.4980 - lon) * 460;
  e += 14 * fbm(lon * 120, lat * 120, 3);

  // Macizo de los Farallones al occidente.
  const m = smoothstep(0, 1, clamp((front - lon) / 0.052, 0, 1));
  e += 2650 * Math.pow(m, 1.45);
  e += 880 * m * ridged(lon * 58, lat * 58, 5);
  e += 190 * m * fbm(lon * 170, lat * 170, 4);

  // Cerros tutelares.
  for (const c of CERROS) {
    const dx = (lon - c.lon) / c.rx;
    const dy = (lat - c.lat) / c.ry;
    e += c.h * Math.exp(-(dx * dx + dy * dy));
  }

  // Cauce del río Cauca: una depresión suave en el oriente.
  const cauca = -76.4905 + 0.010 * Math.sin((lat - 3.30) * 21.0);
  e -= 16 * Math.exp(-Math.pow((lon - cauca) / 0.006, 2));

  return e;
}

export function elevationAtWorld(x, z) {
  const { lon, lat } = unproject(x, z);
  return elevationM(lon, lat);
}

/** Altura Y de escena en un punto del mundo (con terraceado opcional). */
export function heightAtWorld(x, z, terraced = false) {
  const e = elevationAtWorld(x, z);
  return sceneY(terraced ? Math.floor(e / TERRACE_STEP) * TERRACE_STEP : e);
}

/* ------------------------------------------------------------------ */
/* Color por altitud (paleta glaciar: índigo → teal → violeta → magenta)*/
/* ------------------------------------------------------------------ */

const RAMP = [
  [0.00, 0x0a1130],
  [0.08, 0x102a5c],
  [0.20, 0x14558c],
  [0.34, 0x1d92a6],
  [0.48, 0x3f6fc8],
  [0.62, 0x6d52c6],
  [0.78, 0xa049bd],
  [0.90, 0xd4559f],
  [1.00, 0xf3a9d8],
];

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

function rampColor(t, out) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = (t - t0) / (t1 - t0);
      _c1.setHex(c0, THREE.SRGBColorSpace);
      _c2.setHex(c1, THREE.SRGBColorSpace);
      return out.copy(_c1).lerp(_c2, k);
    }
  }
  return out.setHex(RAMP[RAMP.length - 1][1], THREE.SRGBColorSpace);
}

/* ------------------------------------------------------------------ */
/* Malla del terreno                                                    */
/* ------------------------------------------------------------------ */

export function buildTerrain({ segments = 260 } = {}) {
  const segX = Math.round(segments * (MAP_W / MAP_H));
  const segZ = segments;
  const geo = new THREE.PlaneGeometry(MAP_W, MAP_H, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const e = elevationAtWorld(x, z);
    // Terraceado tipo maqueta de curvas de nivel.
    const terraced = Math.floor(e / TERRACE_STEP) * TERRACE_STEP;
    pos.setY(i, sceneY(terraced));

    const t = (e - 950) / 2900;
    rampColor(t, col);
    // El valle se oscurece para que el neón de la ciudad resalte.
    const dim = lerp(0.13, 0.62, smoothstep(950, 1900, e));
    col.multiplyScalar(dim);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.58,
    metalness: 0.18,
    envMapIntensity: 0.6,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terreno';
  mesh.receiveShadow = true;
  return mesh;
}

/** Faldón lateral opaco, para que la maqueta se vea como un bloque sólido. */
export function buildBase() {
  const depth = 2.2;
  const shape = new THREE.Shape();
  shape.moveTo(-MAP_W / 2, -MAP_H / 2);
  shape.lineTo(MAP_W / 2, -MAP_H / 2);
  shape.lineTo(MAP_W / 2, MAP_H / 2);
  shape.lineTo(-MAP_W / 2, MAP_H / 2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, sceneY(940), 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x070b1d, roughness: 0.9, metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'zocalo';
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Curvas de nivel (marching squares)                                   */
/* ------------------------------------------------------------------ */

export function buildContours({ cols = 190, rows = 230 } = {}) {
  const grid = new Float32Array((cols + 1) * (rows + 1));
  let min = Infinity, max = -Infinity;

  const px = (i) => MAP.lonMin + ((MAP.lonMax - MAP.lonMin) * i) / cols;
  const py = (j) => MAP.latMin + ((MAP.latMax - MAP.latMin) * j) / rows;

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const e = elevationM(px(i), py(j));
      grid[j * (cols + 1) + i] = e;
      if (e < min) min = e;
      if (e > max) max = e;
    }
  }

  const positions = [];
  const colors = [];
  const col = new THREE.Color();
  const at = (i, j) => grid[j * (cols + 1) + i];

  const pushPoint = (lon, lat, level) => {
    const p = project(lon, lat);
    positions.push(p.x, sceneY(level) + 0.012, p.z);
    rampColor((level - 950) / 2900, col);
    col.lerp(_c1.setHex(0xffffff, THREE.SRGBColorSpace), 0.35);
    colors.push(col.r, col.g, col.b);
  };

  const start = Math.ceil(min / CONTOUR_STEP) * CONTOUR_STEP;
  for (let level = start; level < max; level += CONTOUR_STEP) {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v0 = at(i, j), v1 = at(i + 1, j);
        const v2 = at(i + 1, j + 1), v3 = at(i, j + 1);
        let idx = 0;
        if (v0 > level) idx |= 1;
        if (v1 > level) idx |= 2;
        if (v2 > level) idx |= 4;
        if (v3 > level) idx |= 8;
        if (idx === 0 || idx === 15) continue;

        const lon0 = px(i), lon1 = px(i + 1);
        const lat0 = py(j), lat1 = py(j + 1);
        const ix = (va, vb, a, b) => a + ((level - va) / (vb - va)) * (b - a);

        // Puntos de corte en cada arista de la celda.
        const E = {
          bottom: [ix(v0, v1, lon0, lon1), lat0],
          right: [lon1, ix(v1, v2, lat0, lat1)],
          top: [ix(v3, v2, lon0, lon1), lat1],
          left: [lon0, ix(v0, v3, lat0, lat1)],
        };
        const LINKS = {
          1: [['bottom', 'left']], 2: [['bottom', 'right']],
          3: [['left', 'right']], 4: [['right', 'top']],
          5: [['bottom', 'right'], ['left', 'top']],
          6: [['bottom', 'top']], 7: [['left', 'top']],
          8: [['left', 'top']], 9: [['bottom', 'top']],
          10: [['bottom', 'left'], ['right', 'top']],
          11: [['right', 'top']], 12: [['left', 'right']],
          13: [['bottom', 'right']], 14: [['bottom', 'left']],
        };
        for (const [a, b] of LINKS[idx]) {
          pushPoint(E[a][0], E[a][1], level);
          pushPoint(E[b][0], E[b][1], level);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = 'curvas-nivel';
  return lines;
}

/* ------------------------------------------------------------------ */
/* Retícula urbana (las calles de Cali, orientadas ~ -25°)              */
/* ------------------------------------------------------------------ */

export function buildCityGrid() {
  const ANG = THREE.MathUtils.degToRad(-24);
  const cos = Math.cos(ANG), sin = Math.sin(ANG);
  const center = project(-76.5280, 3.4390);
  const halfU = 5.6, halfV = 7.4; // extensión de la mancha urbana, en km
  const spacing = 0.55;
  const positions = [];

  const toWorld = (u, v) => ({
    x: center.x + u * cos - v * sin,
    z: center.z + u * sin + v * cos,
  });

  const addLine = (fromU, fromV, toU, toV) => {
    const N = 26;
    let prev = null;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const w = toWorld(lerp(fromU, toU, t), lerp(fromV, toV, t));
      const e = elevationAtWorld(w.x, w.z);
      // La retícula sólo existe sobre el plano urbano.
      if (e > 1180) { prev = null; continue; }
      const p = new THREE.Vector3(w.x, sceneY(e) + 0.02, w.z);
      if (prev) positions.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
  };

  for (let u = -halfU; u <= halfU; u += spacing) addLine(u, -halfV, u, halfV);
  for (let v = -halfV; v <= halfV; v += spacing) addLine(-halfU, v, halfU, v);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x7fb6ff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const grid = new THREE.LineSegments(geo, mat);
  grid.name = 'reticula-urbana';
  return grid;
}
