import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { project, sceneY } from './config.js';
import { elevationAtWorld } from './terrain.js';
import { RIOS, VIAS, RUTA_TURISTICA, POIS } from './data.js';

/** Materiales de línea que necesitan conocer el tamaño del lienzo. */
export const lineMaterials = [];

/** Convierte una polilínea lon/lat en una curva suave pegada al terreno. */
export function drape(puntosLonLat, { muestras = 260, offset = 0.05 } = {}) {
  const ctrl = puntosLonLat.map(([lon, lat]) => {
    const p = project(lon, lat);
    return new THREE.Vector3(p.x, 0, p.z);
  });
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.4);
  const pts = curve.getPoints(muestras);
  for (const p of pts) p.y = sceneY(elevationAtWorld(p.x, p.z)) + offset;
  return pts;
}

function fatLine(points, { color, width, opacity = 1, blending = THREE.AdditiveBlending }) {
  const positions = [];
  for (const p of points) positions.push(p.x, p.y, p.z);
  const geo = new LineGeometry();
  geo.setPositions(positions);
  const mat = new LineMaterial({
    color,
    linewidth: width,
    transparent: true,
    opacity,
    blending,
    depthWrite: false,
    dashed: false,
    alphaToCoverage: false,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  lineMaterials.push(mat);
  const line = new Line2(geo, mat);
  line.computeLineDistances();
  return line;
}

/** Ríos: doble trazo (núcleo claro + halo ancho) para el efecto neón. */
export function buildRios() {
  const group = new THREE.Group();
  group.name = 'rios';
  for (const rio of RIOS) {
    const pts = drape(rio.puntos, { offset: 0.03 });
    group.add(fatLine(pts, { color: 0x1152cc, width: rio.ancho * 1.9, opacity: 0.16 }));
    group.add(fatLine(pts, { color: 0x6fe0ff, width: rio.ancho * 0.55, opacity: 0.8 }));
  }
  return group;
}

/** Vías principales, en ámbar incandescente. */
export function buildVias() {
  const group = new THREE.Group();
  group.name = 'vias';
  for (const via of VIAS) {
    const pts = drape(via.puntos, { offset: 0.06 });
    group.add(fatLine(pts, { color: 0xff3c00, width: via.ancho * 2.0, opacity: 0.14 }));
    group.add(fatLine(pts, { color: 0xff9b4a, width: via.ancho * 0.55, opacity: 0.85 }));
  }
  return group;
}

/**
 * Ruta turística del centro: cinta violeta con partículas que viajan a lo
 * largo del recorrido. La velocidad y el brillo dependen de la afluencia.
 */
export function buildRuta() {
  const group = new THREE.Group();
  group.name = 'ruta-turistica';

  const lonlat = RUTA_TURISTICA.map((id) => {
    const p = POIS.find((q) => q.id === id);
    return [p.lon, p.lat];
  });
  const pts = drape(lonlat, { muestras: 420, offset: 0.09 });

  group.add(fatLine(pts, { color: 0x6b2bff, width: 5.0, opacity: 0.16 }));
  group.add(fatLine(pts, { color: 0xb98dff, width: 1.3, opacity: 0.85 }));

  // Partículas que recorren la ruta.
  const COUNT = 140;
  const positions = new Float32Array(COUNT * 3);
  const offsets = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) offsets[i] = i / COUNT;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.13,
    map: glowSprite(),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'flujo-ruta';
  group.add(points);

  group.userData.update = (t, densidad) => {
    const n = pts.length;
    for (let i = 0; i < COUNT; i++) {
      const visible = i / COUNT < densidad;
      let u = (offsets[i] + t * 0.045) % 1;
      const idx = Math.min(n - 1, Math.floor(u * (n - 1)));
      const p = pts[idx];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = visible ? p.y + 0.05 : -999;
      positions[i * 3 + 2] = p.z;
    }
    geo.attributes.position.needsUpdate = true;
  };

  return group;
}

/** Textura radial reutilizable para puntos y halos. */
let _glow = null;
export function glowSprite() {
  if (_glow) return _glow;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.42, 'rgba(180,210,255,0.35)');
  g.addColorStop(1.0, 'rgba(120,160,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glow = new THREE.CanvasTexture(canvas);
  _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}
