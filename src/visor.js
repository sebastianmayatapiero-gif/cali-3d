import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Visor de dioramas: abre el modelo 3D de una tienda en una escena propia,
 * cálida como una vitrina iluminada, y deja girarlo 360° con el mouse.
 *
 * Es una escena aparte del mapa (renderer, cámara y bucle propios) que sólo
 * dibuja mientras está abierta.
 */

const FONDO_INTERIOR = 0xc44a26;
const FONDO_EXTERIOR = 0x5d1b0e;

export function crearVisor({ onCerrar } = {}) {
  const raiz = document.getElementById('visor');
  const lienzo = document.getElementById('visor-lienzo');
  const barra = document.getElementById('visor-progreso');
  const barraInt = barra.querySelector('i');
  const estado = document.getElementById('visor-estado');

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = fondoDegradado();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotateSpeed = 0.5;
  controls.enablePan = false;

  // Luces de respaldo: sólo se encienden si el .glb no trae las suyas.
  const luces = new THREE.Group();
  const key = new THREE.DirectionalLight(0xfff0e0, 2.6);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0008;
  const fill = new THREE.DirectionalLight(0xffd0b0, 0.9);
  fill.position.set(-4, 2.5, -2);
  const top = new THREE.HemisphereLight(0xffe6d0, 0x3a1008, 0.7);
  luces.add(key, fill, top);

  // Ambiente tenue: aunque el modelo traiga luces, evita negros absolutos.
  const relleno = new THREE.AmbientLight(0xffd9c0, 0.35);
  scene.add(relleno);

  let modelo = null;       // objeto3D actualmente en escena
  let abierto = false;
  let rafId = 0;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath('vendor/three/examples/jsm/libs/draco/gltf/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  /* --------------------------- ciclo de vida ---------------------------- */

  function abrir(t) {
    abierto = true;
    raiz.classList.remove('oculto');
    raiz.setAttribute('aria-hidden', 'false');
    document.getElementById('visor-nombre').textContent = t.nombre;
    document.getElementById('visor-oficio').textContent = t.oficio;
    document.getElementById('visor-barrio').textContent = t.barrio;
    document.getElementById('visor-horario').textContent = t.horario;
    document.getElementById('visor-desc').textContent = t.desc;
    redimensionar();
    limpiarModelo();

    if (t.modelo) cargar(t.modelo);
    else mostrar(dioramaProvisional(), { propias: false });

    if (!rafId) animar();
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    raiz.classList.add('oculto');
    raiz.setAttribute('aria-hidden', 'true');
    cancelAnimationFrame(rafId);
    rafId = 0;
    limpiarModelo();
    onCerrar?.();
  }

  /* ------------------------------ carga --------------------------------- */

  function cargar(url) {
    progreso(0, 'Cargando el diorama…');
    loader.load(
      url,
      (gltf) => {
        progreso(1, '');
        const luzPropia = tieneLuces(gltf.scene);
        mostrar(gltf.scene, { propias: luzPropia, camara: gltf.cameras?.[0] ?? null });
      },
      (ev) => {
        if (ev.lengthComputable) progreso(ev.loaded / ev.total, 'Cargando el diorama…');
      },
      (err) => {
        console.error('[visor] no se pudo cargar', url, err);
        progreso(1, 'No se pudo cargar el modelo de esta tienda.');
        mostrar(dioramaProvisional(), { propias: false });
      },
    );
  }

  function mostrar(obj, { propias = false, camara = null } = {}) {
    modelo = obj;
    obj.traverse((n) => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });
    // Las luces del .glb mandan; las de respaldo sólo entran si no hay ninguna.
    if (propias) luces.removeFromParent();
    else scene.add(luces);
    relleno.intensity = propias ? 0.18 : 0.35;

    scene.add(obj);
    encuadrar(obj, camara);
  }

  function limpiarModelo() {
    if (!modelo) return;
    scene.remove(modelo);
    modelo.traverse((n) => {
      if (n.isMesh) {
        n.geometry?.dispose();
        for (const m of [].concat(n.material ?? [])) {
          for (const k of Object.keys(m)) {
            if (m[k] && m[k].isTexture) m[k].dispose();
          }
          m.dispose?.();
        }
      }
    });
    modelo = null;
  }

  /* ---------------------------- encuadre -------------------------------- */

  /** Centra el modelo en el origen y sitúa la cámara para que quepa entero. */
  function encuadrar(obj, camaraGltf) {
    const caja = cajaDelDiorama(obj);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    obj.position.sub(centro); // el diorama gira sobre su propio centro

    const radio = Math.max(tam.x, tam.y, tam.z) * 0.5 || 1;
    const dist = radio / Math.sin((camera.fov * Math.PI) / 360) * 1.25;

    camera.near = Math.max(radio / 100, 0.01);
    camera.far = radio * 100;

    if (camaraGltf) {
      // La cámara que venga del .glb define el ángulo inicial; el usuario sigue libre.
      const p = camaraGltf.getWorldPosition(new THREE.Vector3()).sub(centro);
      if (p.lengthSq() > 1e-6) camera.position.copy(p.setLength(dist));
      else camera.position.set(dist * 0.8, dist * 0.55, dist * 0.8);
    } else {
      camera.position.set(dist * 0.75, dist * 0.55, dist * 0.8);
    }

    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = radio * 0.6;
    controls.maxDistance = dist * 3;
    controls.update();

    key.position.set(radio * 2.2, radio * 3.2, radio * 2.6);
    key.shadow.camera.left = -radio * 2;
    key.shadow.camera.right = radio * 2;
    key.shadow.camera.top = radio * 2;
    key.shadow.camera.bottom = -radio * 2;
    key.shadow.camera.far = radio * 12;
    key.shadow.camera.updateProjectionMatrix();
    fill.position.set(-radio * 2.4, radio * 1.6, -radio * 1.8);
  }

  /* ------------------------------ bucle --------------------------------- */

  function animar() {
    rafId = requestAnimationFrame(animar);
    controls.update();
    renderer.render(scene, camera);
  }

  function redimensionar() {
    const caja = lienzo.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(caja.width));
    const h = Math.max(1, Math.round(caja.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function progreso(f, texto) {
    barra.style.opacity = f >= 1 ? '0' : '1';
    barraInt.style.width = `${Math.round(f * 100)}%`;
    estado.textContent = texto ?? '';
  }

  /* ----------------------------- controles ------------------------------ */

  document.getElementById('visor-cerrar').addEventListener('click', cerrar);
  document.getElementById('visor-girar').addEventListener('click', (ev) => {
    controls.autoRotate = !controls.autoRotate;
    ev.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  raiz.addEventListener('click', (ev) => { if (ev.target === raiz) cerrar(); });
  window.addEventListener('resize', () => { if (abierto) redimensionar(); });

  return { abrir, cerrar, get abierto() { return abierto; } };
}

/* ------------------------------ auxiliares ------------------------------ */

/**
 * Caja de encuadre del diorama, ignorando el decorado.
 *
 * Los .glb exportados desde Blender suelen traer el set del render —piso
 * enorme, paredes de fondo— y si se encuadra sobre todo eso el diorama queda
 * diminuto. Se mide cada malla por separado y se descartan las que son
 * desproporcionadas frente a la mediana.
 */
function cajaDelDiorama(obj) {
  const completa = new THREE.Box3().setFromObject(obj);
  const cajas = [];
  obj.updateWorldMatrix(true, true);
  obj.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const b = new THREE.Box3().setFromObject(n);
    if (b.isEmpty()) return;
    cajas.push({ b, d: b.getSize(new THREE.Vector3()).length() });
  });
  if (cajas.length < 6) return completa;

  const orden = cajas.map((c) => c.d).sort((a, b) => a - b);
  const mediana = orden[Math.floor(orden.length / 2)] || 1;
  const limite = mediana * 6;

  const util = new THREE.Box3();
  let contadas = 0;
  for (const c of cajas) {
    if (c.d > limite) continue; // decorado: piso, paredes, telón de fondo
    util.union(c.b);
    contadas++;
  }
  // Si el recorte deja fuera casi todo, el criterio no aplica a este modelo.
  if (contadas < cajas.length * 0.3 || util.isEmpty()) return completa;
  return util;
}

function tieneLuces(raiz) {
  let hay = false;
  raiz.traverse((n) => { if (n.isLight) hay = true; });
  return hay;
}

/** Fondo cálido de vitrina, del mismo tono que los renders de los dioramas. */
function fondoDegradado() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#' + new THREE.Color(FONDO_EXTERIOR).getHexString());
  g.addColorStop(0.55, '#' + new THREE.Color(FONDO_INTERIOR).getHexString());
  g.addColorStop(1, '#7d2a14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Diorama de relleno mientras no hay .glb: una tienda esquemática, para poder
 * probar la interacción y el encuadre.
 */
function dioramaProvisional() {
  const g = new THREE.Group();
  const mat = (hex, rough = 0.7) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.05 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 3), mat(0x8d9199));
  base.position.y = -0.1;
  g.add(base);

  const piso = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.06, 2.8), mat(0xd4622c, 0.85));
  piso.position.y = 0.03;
  g.add(piso);

  const mostrador = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.9), mat(0xe8e4dc, 0.6));
  mostrador.position.set(-0.5, 0.45, -0.6);
  g.add(mostrador);

  const vitrina = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.5, 0.8),
    new THREE.MeshPhysicalMaterial({
      color: 0xbfe6ff, roughness: 0.1, metalness: 0, transmission: 0.85, thickness: 0.4,
    }),
  );
  vitrina.position.set(-0.5, 1.15, -0.6);
  g.add(vitrina);

  const pared = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, 0.12), mat(0xb8442a, 0.9));
  pared.position.set(0, 1.1, -1.4);
  g.add(pared);

  for (let i = 0; i < 6; i++) {
    const caja = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.34),
      mat([0xf2b8a0, 0xe0754f, 0xf6d9a0, 0xc94f32][i % 4], 0.75),
    );
    caja.position.set(-1.4 + i * 0.42, 1.52, -1.1);
    g.add(caja);
  }

  const banca = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), mat(0x6b4a33, 0.8));
  banca.position.set(1.2, 0.55, 0.4);
  g.add(banca);
  for (const [x, z] of [[0.95, 0.15], [1.45, 0.15], [0.95, 0.65], [1.45, 0.65]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), mat(0x3b2a20));
    pata.position.set(x, 0.3, z);
    g.add(pata);
  }

  g.userData.provisional = true;
  return g;
}
