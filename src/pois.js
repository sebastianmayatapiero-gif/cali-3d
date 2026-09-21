import * as THREE from 'three';
import { project, sceneY, lerp, clamp } from './config.js';
import { elevationAtWorld } from './terrain.js';
import { POIS, CATEGORIAS, intensidad, visitantes } from './data.js';
import { TIENDAS, COLOR_TIENDA } from './tiendas.js';
import { glowSprite } from './lines.js';

const BEAM_VERT = /* glsl */`
  varying float vY;
  void main() {
    vY = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vY;
  void main() {
    float fade = pow(1.0 - vY, 1.8);
    gl_FragColor = vec4(uColor, fade * uOpacity);
  }
`;

/**
 * Crea los marcadores de los puntos turísticos: núcleo luminoso, halo,
 * haz vertical y anillo en el suelo.
 */
export function buildPois() {
  const group = new THREE.Group();
  group.name = 'pois';
  const marcadores = [];
  const pickables = [];

  const sphereGeo = new THREE.SphereGeometry(0.09, 20, 16);
  const beamGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 12, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const ringGeo = new THREE.RingGeometry(0.22, 0.28, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const pickGeo = new THREE.SphereGeometry(0.42, 10, 8);

  for (const poi of POIS) {
    const p = project(poi.lon, poi.lat);
    const elev = poi.alturaM ?? elevationAtWorld(p.x, p.z);
    const y = sceneY(elev);
    const color = new THREE.Color(CATEGORIAS[poi.cat].color);

    const nodo = new THREE.Group();
    nodo.position.set(p.x, y, p.z);
    nodo.userData.poi = poi;

    const core = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.6), transparent: true, opacity: 0.92 }),
    );
    core.position.y = 0.55;
    nodo.add(core);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(),
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    halo.position.y = 0.55;
    halo.scale.setScalar(1.0);
    nodo.add(halo);

    const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone() },
        uOpacity: { value: 0.5 },
      },
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    nodo.add(beam);

    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    ring.position.y = 0.015;
    nodo.add(ring);

    const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = 0.55;
    pick.userData.poiId = poi.id;
    nodo.add(pick);
    pickables.push(pick);

    group.add(nodo);
    marcadores.push({ poi, nodo, core, halo, beam, ring, color, y });
  }

  /** Actualiza tamaños, brillos y pulsos según el mes activo. */
  function update(mes, t, { seleccionado = null, hover = null, escala = 1 } = {}) {
    for (const m of marcadores) {
      const k = intensidad(m.poi.id, mes);
      const activo = seleccionado === m.poi.id;
      const señalado = hover === m.poi.id;

      const pulso = 0.5 + 0.5 * Math.sin(t * 2.0 + m.y * 3.0);
      const base = lerp(0.3, 1.05, k) * escala;

      m.halo.scale.setScalar(base * (activo ? 1.55 : 1) * (1 + 0.08 * pulso));
      m.halo.material.opacity = lerp(0.45, 1.0, k) * (activo ? 1 : señalado ? 0.95 : 0.8);
      m.core.scale.setScalar(lerp(0.45, 1.15, k) * (activo ? 1.4 : 1) * escala);

      const altura = lerp(0.3, 2.2, k) * (activo ? 1.45 : 1);
      m.beam.scale.set(lerp(0.7, 1.6, k), altura, lerp(0.7, 1.6, k));
      m.beam.material.uniforms.uOpacity.value = lerp(0.18, 0.62, k) * (activo ? 1.4 : 1);

      const rs = lerp(0.7, 1.7, k) * escala * (activo ? 1.3 + 0.1 * pulso : 1);
      m.ring.scale.setScalar(rs);
      m.ring.material.opacity = (activo ? 0.95 : lerp(0.25, 0.6, k)) * (0.75 + 0.25 * pulso);

      const alto = 0.45 * escala;
      m.core.position.y = alto;
      m.halo.position.y = alto;
    }
  }

  function posicion(poiId) {
    const m = marcadores.find((x) => x.poi.id === poiId);
    return m ? m.nodo.position.clone() : null;
  }

  return { group, marcadores, pickables, update, posicion };
}

/**
 * Campo de calor: enjambre de partículas alrededor de cada punto cuya
 * densidad refleja la afluencia del mes (el "fluido de turistas").
 */
export function buildEnjambre({ porPoi = 90 } = {}) {
  const total = POIS.length * porPoi;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const semillas = new Float32Array(total * 3); // radio, fase, velocidad
  const origen = new Float32Array(total * 3);
  const poiIndex = new Int32Array(total);

  let i = 0;
  POIS.forEach((poi, pi) => {
    const p = project(poi.lon, poi.lat);
    const y = sceneY(poi.alturaM ?? elevationAtWorld(p.x, p.z));
    const color = new THREE.Color(CATEGORIAS[poi.cat].color);
    for (let k = 0; k < porPoi; k++) {
      origen[i * 3] = p.x; origen[i * 3 + 1] = y; origen[i * 3 + 2] = p.z;
      semillas[i * 3] = 0.25 + Math.random() * 1.5;
      semillas[i * 3 + 1] = Math.random() * Math.PI * 2;
      semillas[i * 3 + 2] = 0.25 + Math.random() * 0.9;
      colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      poiIndex[i] = pi;
      positions[i * 3 + 1] = -999;
      i++;
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.13,
    map: glowSprite(),
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'enjambre-turistas';

  function update(mes, t) {
    for (let j = 0; j < total; j++) {
      const poi = POIS[poiIndex[j]];
      const k = intensidad(poi.id, mes);
      const cupo = 0.12 + 0.88 * k; // fracción de partículas activas
      const activa = (j % porPoi) / porPoi < cupo;
      if (!activa) { positions[j * 3 + 1] = -999; continue; }
      const r = semillas[j * 3] * (0.55 + 0.9 * k);
      const fase = semillas[j * 3 + 1];
      const vel = semillas[j * 3 + 2];
      const a = fase + t * vel * 0.35;
      positions[j * 3] = origen[j * 3] + Math.cos(a) * r;
      positions[j * 3 + 2] = origen[j * 3 + 2] + Math.sin(a) * r * 0.8;
      positions[j * 3 + 1] =
        origen[j * 3 + 1] + 0.12 + Math.abs(Math.sin(a * 1.7 + fase)) * (0.25 + 0.9 * k);
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { points, update };
}

/** Texto corto para las cifras (12.4 k). */
export function formatoVisitantes(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' k';
  return String(n);
}

export { visitantes, clamp };

/**
 * Marcadores de las tiendas destacadas: ámbar cálido —el color de los
 * dioramas— y con forma de vitrina, para distinguirlos de los puntos
 * turísticos aunque compartan mapa.
 */
export function buildTiendas() {
  const group = new THREE.Group();
  group.name = 'tiendas';
  const marcadores = [];
  const pickables = [];

  const color = new THREE.Color(COLOR_TIENDA);
  const cajaGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const anilloGeo = new THREE.RingGeometry(0.3, 0.38, 6);
  anilloGeo.rotateX(-Math.PI / 2);
  const hazGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 12, 1, true);
  hazGeo.translate(0, 0.5, 0);
  const pickGeo = new THREE.SphereGeometry(0.5, 10, 8);

  for (const t of TIENDAS) {
    const p = project(t.lon, t.lat);
    const y = sceneY(elevationAtWorld(p.x, p.z));

    const nodo = new THREE.Group();
    nodo.position.set(p.x, y, p.z);
    nodo.userData.tienda = t;

    const caja = new THREE.Mesh(
      cajaGeo,
      new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.45) }),
    );
    caja.position.y = 0.75;
    caja.rotation.set(Math.PI / 5, Math.PI / 4, 0);
    nodo.add(caja);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(), color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.position.y = 0.75;
    nodo.add(halo);

    const haz = new THREE.Mesh(hazGeo, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color.clone() }, uOpacity: { value: 0.55 } },
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide,
    }));
    nodo.add(haz);

    const anillo = new THREE.Mesh(anilloGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    anillo.position.y = 0.02;
    nodo.add(anillo);

    const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = 0.7;
    pick.userData.tiendaId = t.id;
    nodo.add(pick);
    pickables.push(pick);

    group.add(nodo);
    marcadores.push({ tienda: t, nodo, caja, halo, haz, anillo });
  }

  function update(t, { seleccionada = null, escala = 1 } = {}) {
    for (const m of marcadores) {
      const activa = seleccionada === m.tienda.id;
      const pulso = 0.5 + 0.5 * Math.sin(t * 1.6 + m.nodo.position.x);
      const k = (activa ? 1.45 : 1) * escala;

      m.caja.rotation.y = t * 0.6;
      m.caja.position.y = (0.72 + 0.06 * pulso) * escala;
      m.caja.scale.setScalar(k);
      m.halo.position.y = m.caja.position.y;
      m.halo.scale.setScalar((1.1 + 0.12 * pulso) * k);
      m.haz.scale.set(k, 1.9 * (activa ? 1.35 : 1), k);
      m.haz.material.uniforms.uOpacity.value = 0.34 + 0.16 * pulso;
      m.anillo.rotation.y = -t * 0.35;
      m.anillo.scale.setScalar((1.25 + 0.1 * pulso) * k);
      m.anillo.material.opacity = activa ? 1 : 0.55 + 0.25 * pulso;
    }
  }

  function posicion(id) {
    const m = marcadores.find((x) => x.tienda.id === id);
    return m ? m.nodo.position.clone() : null;
  }

  return { group, marcadores, pickables, update, posicion };
}
