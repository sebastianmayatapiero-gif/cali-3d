/**
 * Parámetros globales del mapa 3D de Cali.
 * Sistema de coordenadas de escena: 1 unidad = 1 km, X→Este, Z→Sur, Y→altura.
 */

export const CENTER = { lat: 3.4372, lon: -76.5225 };

export const KM_PER_DEG_LAT = 110.574;
export const KM_PER_DEG_LON = 111.320 * Math.cos((CENTER.lat * Math.PI) / 180);

// Recorte del mapa: valle del Cauca al este, farallones al oeste.
export const MAP = {
  latMin: 3.315,
  latMax: 3.525,
  lonMin: -76.625,
  lonMax: -76.455,
};

export const MAP_W = (MAP.lonMax - MAP.lonMin) * KM_PER_DEG_LON; // ~18.9 km
export const MAP_H = (MAP.latMax - MAP.latMin) * KM_PER_DEG_LAT; // ~23.2 km

/** Exageración vertical: km de escena por km real de altitud. */
export const VERT_EXAG = 1.9;

/** Intervalo de las curvas de nivel, en metros. */
export const CONTOUR_STEP = 120;

/** Altura del terraceado tipo "maqueta de curvas de nivel", en metros. */
export const TERRACE_STEP = 120;

export const PALETTE = {
  agua: 0x35d6ff,
  via: 0xff7a2f,
  ruta: 0xb46bff,
  poi: 0x9fd8ff,
  poiAlto: 0xff5fae,
  reja: 0x8fd4ff,
};

export function project(lon, lat) {
  return {
    x: (lon - CENTER.lon) * KM_PER_DEG_LON,
    z: -(lat - CENTER.lat) * KM_PER_DEG_LAT,
  };
}

export function unproject(x, z) {
  return {
    lon: x / KM_PER_DEG_LON + CENTER.lon,
    lat: -z / KM_PER_DEG_LAT + CENTER.lat,
  };
}

/** Metros de altitud → unidades Y de escena. */
export function sceneY(elevM) {
  return (elevM / 1000) * VERT_EXAG;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
