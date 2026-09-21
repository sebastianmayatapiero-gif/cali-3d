import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { MAP_W, MAP_H, sceneY, clamp } from './config.js';
import { buildTerrain, buildBase, buildContours, buildCityGrid } from './terrain.js';
import { buildRios, buildVias, buildRuta, lineMaterials } from './lines.js';
import { buildPois, buildEnjambre, buildTiendas } from './pois.js';
import { crearVisor } from './visor.js';
import { tienda } from './tiendas.js';
import { crearEtiquetas } from './labels.js';
import { crearUI } from './ui.js';
import { POIS, TOTAL_MES, MAX_TOTAL } from './data.js';

const contenedor = document.getElementById('escena');
const cargaTxt = document.getElementById('carga-txt');
const paso = (t) => { cargaTxt.textContent = t; };

/* ------------------------------ escena ------------------------------ */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070f, 0.011);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 400);
const VISTA_INICIAL = {
  pos: new THREE.Vector3(9.5, 15.0, 17.0),
  target: new THREE.Vector3(-0.6, sceneY(1050), -0.4),
};
// En pantallas verticales (móvil) la cámara se aleja para que quepa el valle.
const aspecto = window.innerWidth / window.innerHeight;
if (aspecto < 1) VISTA_INICIAL.pos.multiplyScalar(1 + (1 - aspecto) * 0.5);
camera.position.copy(VISTA_INICIAL.pos);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
contenedor.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
scene.environmentIntensity = 0.18;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.copy(VISTA_INICIAL.target);
controls.minDistance = 1.2;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI * 0.47;
controls.autoRotateSpeed = 0.35;
controls.zoomSpeed = 0.9;

/* ------------------------------- luces ------------------------------- */
scene.add(new THREE.AmbientLight(0x1b2947, 0.55));

const hemi = new THREE.HemisphereLight(0x7ea6e0, 0x140a26, 0.38);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xcfe2ff, 1.15);
key.position.set(-22, 26, 16);
scene.add(key);

const rim = new THREE.DirectionalLight(0xa860ff, 0.55);
rim.position.set(18, 9, -20);
scene.add(rim);

const fill = new THREE.PointLight(0x35d6ff, 40, 50, 2);
fill.position.set(2, 7, 2);
scene.add(fill);

/* ------------------------------ estrellas ---------------------------- */
function crearEstrellas() {
  const N = 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 120 + Math.random() * 120;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(THREE.MathUtils.lerp(-0.15, 1, Math.random()));
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.55 + 10;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xbfd8ff, size: 0.7, sizeAttenuation: true,
    transparent: true, opacity: 0.75, depthWrite: false,
  });
  const p = new THREE.Points(geo, mat);
  p.name = 'estrellas';
  return p;
}

/* ------------------------------- montaje ----------------------------- */
paso('Generando el relieve del valle…');

const terreno = buildTerrain({ segments: 260 });
const zocalo = buildBase();
const capas = {};

scene.add(crearEstrellas(), terreno, zocalo);

paso('Trazando curvas de nivel…');
capas.curvas = buildContours();
scene.add(capas.curvas);

paso('Dibujando ríos y vías…');
capas.rios = buildRios();
capas.vias = buildVias();
capas.reticula = buildCityGrid();
capas.ruta = buildRuta();
scene.add(capas.rios, capas.vias, capas.reticula, capas.ruta);

paso('Ubicando puntos turísticos…');
const pois = buildPois();
scene.add(pois.group);

const tiendas = buildTiendas();
capas.tiendas = tiendas.group;
scene.add(tiendas.group);

const enjambre = buildEnjambre({ porPoi: 90 });
capas.enjambre = enjambre.points;
scene.add(enjambre.points);

// Plano invisible bajo el mapa: hace de "suelo" para deseleccionar al hacer clic.
const fondoClick = new THREE.Mesh(
  new THREE.PlaneGeometry(MAP_W * 1.4, MAP_H * 1.4).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ visible: false }),
);
fondoClick.position.y = sceneY(900);
scene.add(fondoClick);

/* ------------------------------ postproceso -------------------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.52, 0.55, 0.52,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* -------------------------- etiquetas e interfaz --------------------- */
let seleccion = null;
let seleccionTienda = null;
let hover = null;
let reproduciendo = false;

// El diorama de cada tienda vive en su propia escena, encima del mapa.
const visor = crearVisor({ onCerrar: () => { seleccionTienda = null; } });

const etiquetas = crearEtiquetas(
  document.getElementById('etiquetas'), pois.marcadores, (id) => seleccionar(id, true),
);

const ui = crearUI({
  onMes: (m) => etiquetas.setMes(m),
  onSelect: (id) => seleccionar(id, true),
  onVolar: (id) => volarA(id, 2.6),
  onTienda: (id) => abrirTienda(id),
  onPlay: (on) => { reproduciendo = on; },
  onCapa: (clave, valor) => {
    if (clave === 'etiquetas') { etiquetas.setVisibles(valor); return; }
    if (clave === 'giro') { controls.autoRotate = valor; return; }
    if (capas[clave]) capas[clave].visible = valor;
  },
});

etiquetas.setMes(ui.mes);

/* ------------------------- selección y vuelo ------------------------- */
const reloj = new THREE.Clock();
const vuelo = {
  activo: false, inicio: 0, dur: 1.15,
  desdePos: new THREE.Vector3(), aPos: new THREE.Vector3(),
  desdeTgt: new THREE.Vector3(), aTgt: new THREE.Vector3(),
};

function volarA(poiId, distancia = 3.4) {
  const destino = poiId ? pois.posicion(poiId) : VISTA_INICIAL.target.clone();
  if (!destino) return;
  const objetivo = destino.clone();
  if (poiId) objetivo.y += 0.45;
  // En pantallas verticales la ficha ocupa la mitad inferior: se apunta un poco
  // más abajo para que el punto quede en la mitad visible.
  if (poiId && window.innerHeight > window.innerWidth) objetivo.y -= distancia * 0.3;

  let pos;
  if (poiId) {
    // Se acerca manteniendo el rumbo actual de la cámara, con una inclinación agradable.
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0.7, 0, 1);
    dir.normalize().multiplyScalar(distancia);
    pos = objetivo.clone().add(dir).setY(objetivo.y + distancia * 0.62);
  } else {
    pos = VISTA_INICIAL.pos.clone();
  }

  vuelo.activo = true;
  vuelo.inicio = reloj.elapsedTime;
  vuelo.desdePos.copy(camera.position);
  vuelo.aPos.copy(pos);
  vuelo.desdeTgt.copy(controls.target);
  vuelo.aTgt.copy(objetivo);
}

function seleccionar(id, volar = false) {
  seleccion = id;
  ui.setSeleccion(id);
  if (id && volar) volarA(id, 5.0);
}

/** Vuela hasta la tienda y abre su diorama al llegar. */
function abrirTienda(id) {
  const t = tienda(id);
  if (!t) return;
  seleccionTienda = id;
  seleccionar(null);
  const destino = tiendas.posicion(id);
  if (destino) {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0.7, 0, 1);
    dir.normalize().multiplyScalar(4.2);
    vuelo.activo = true;
    vuelo.inicio = reloj.elapsedTime;
    vuelo.desdePos.copy(camera.position);
    vuelo.aPos.copy(destino.clone().add(dir).setY(destino.y + 2.6));
    vuelo.desdeTgt.copy(controls.target);
    vuelo.aTgt.copy(destino.clone().setY(destino.y + 0.4));
  }
  setTimeout(() => visor.abrir(t), destino ? 700 : 0);
}

/* ------------------------------ picking ------------------------------ */
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.2;
const puntero = new THREE.Vector2();
let arrastre = null;

function actualizarPuntero(ev) {
  puntero.x = (ev.clientX / window.innerWidth) * 2 - 1;
  puntero.y = -(ev.clientY / window.innerHeight) * 2 + 1;
}

function poiBajoPuntero() {
  raycaster.setFromCamera(puntero, camera);
  const hits = raycaster.intersectObjects(pois.pickables, false);
  return hits.length ? hits[0].object.userData.poiId : null;
}

function tiendaBajoPuntero() {
  if (!capas.tiendas.visible) return null;
  raycaster.setFromCamera(puntero, camera);
  const hits = raycaster.intersectObjects(tiendas.pickables, false);
  return hits.length ? hits[0].object.userData.tiendaId : null;
}

renderer.domElement.addEventListener('pointerdown', (ev) => {
  arrastre = { x: ev.clientX, y: ev.clientY };
});

renderer.domElement.addEventListener('pointermove', (ev) => {
  actualizarPuntero(ev);
  hover = poiBajoPuntero();
  renderer.domElement.style.cursor = hover || tiendaBajoPuntero() ? 'pointer' : 'grab';
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (!arrastre) return;
  const movido = Math.hypot(ev.clientX - arrastre.x, ev.clientY - arrastre.y);
  arrastre = null;
  if (movido > 6 || ev.button !== 0) return;
  actualizarPuntero(ev);
  const idTienda = tiendaBajoPuntero();
  if (idTienda) { abrirTienda(idTienda); return; }
  const id = poiBajoPuntero();
  if (id) seleccionar(id, true);
  else seleccionar(null);
});

/* ------------------------------ teclado ------------------------------ */
window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  const k = ev.key.toLowerCase();
  if (k === 'r') { seleccionar(null); volarA(null); }
  else if (k === ' ') { ev.preventDefault(); ui.setPlay(!ui.reproduciendo); }
  else if (k === 'arrowright') ui.setMes(ui.mes + 1, true);
  else if (k === 'arrowleft') ui.setMes(ui.mes - 1, true);
  else if (k === 'escape') { if (visor.abierto) visor.cerrar(); else seleccionar(null); }
  else if (k === 'h') ui.alternarInterfaz();
  else if (k === 'tab') {
    ev.preventDefault();
    const i = POIS.findIndex((p) => p.id === seleccion);
    seleccionar(POIS[(i + 1 + POIS.length) % POIS.length].id, true);
  }
});

/* ------------------------------- resize ------------------------------ */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  for (const m of lineMaterials) m.resolution.set(w, h);
}
window.addEventListener('resize', onResize);
onResize();

/* -------------------------------- bucle ------------------------------ */
/** 0…1: qué tan alta es la afluencia total del mes respecto al año. */
function intensidadGlobal() {
  const min = Math.min(...TOTAL_MES);
  return (TOTAL_MES[ui.mes] - min) / (MAX_TOTAL - min);
}

let proximoMes = 0; // instante (s) del siguiente cambio de mes en reproducción
const SEG_POR_MES = 1.15;
const facil = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function animar() {
  requestAnimationFrame(animar);
  const dt = Math.min(reloj.getDelta(), 0.1);
  const t = reloj.elapsedTime;

  // La reproducción se mide con el reloj, no con el delta de cuadro: así avanza
  // al mismo ritmo en equipos lentos.
  if (reproduciendo) {
    if (t > proximoMes) { proximoMes = t + SEG_POR_MES; ui.setMes(ui.mes + 1, true); }
  } else {
    proximoMes = t + SEG_POR_MES;
  }

  // El vuelo también se mide con el reloj, para que dure lo mismo a 15 o a 120 fps.
  if (vuelo.activo) {
    const avance = (t - vuelo.inicio) / vuelo.dur;
    const k = facil(clamp(avance, 0, 1));
    camera.position.lerpVectors(vuelo.desdePos, vuelo.aPos, k);
    controls.target.lerpVectors(vuelo.desdeTgt, vuelo.aTgt, k);
    if (avance >= 1) vuelo.activo = false;
  }

  // Los marcadores crecen un poco cuando la cámara está lejos, para no perderlos.
  const dist = camera.position.distanceTo(controls.target);
  const escala = clamp(0.4 + dist / 26, 0.55, 2.0);

  pois.update(ui.mes, t, { seleccionado: seleccion, hover, escala });
  if (capas.tiendas.visible) tiendas.update(t, { seleccionada: seleccionTienda, escala });
  if (capas.enjambre.visible) enjambre.update(ui.mes, t);
  if (capas.ruta.visible) capas.ruta.userData.update(t, 0.22 + 0.78 * intensidadGlobal());

  fill.intensity = 34 + Math.sin(t * 0.8) * 8;
  controls.update();
  etiquetas.update(camera, seleccion);
  composer.render();
}

animar();

// Gancho de depuración (útil para inspeccionar la escena desde la consola).
window.__cali = { scene, camera, controls, pois, ui };

/* ------------------------------ listo -------------------------------- */
requestAnimationFrame(() => {
  window.__caliListo = true;
  const carga = document.getElementById('cargando');
  carga.classList.add('listo');
  setTimeout(() => carga.remove(), 700);
});
