/**
 * Datos del mapa: puntos turísticos de Cali, ríos, vías, ruta turística y
 * modelo de afluencia de turistas mes a mes.
 *
 * Las cifras de visitantes son una simulación coherente con la estacionalidad
 * real de la ciudad (Feria de Cali, Semana Santa, Petronio Álvarez, vacaciones),
 * no cifras oficiales.
 */

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MESES_CORTOS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

/** Eventos y temporadas que explican los picos de afluencia. */
export const TEMPORADAS = [
  { mes: 0,  nombre: 'Temporada baja',            detalle: 'Resaca de la Feria: la ciudad respira y los precios bajan.' },
  { mes: 1,  nombre: 'Temporada baja',            detalle: 'Mes tranquilo, ideal para museos y miradores sin filas.' },
  { mes: 2,  nombre: 'Semana Santa',              detalle: 'Procesiones e iglesias coloniales concentran los visitantes.' },
  { mes: 3,  nombre: 'Semana Santa / Puentes',    detalle: 'Turismo religioso y de puentes festivos.' },
  { mes: 4,  nombre: 'Temporada media',           detalle: 'Congresos y turismo de negocios sostienen la ocupación.' },
  { mes: 5,  nombre: 'Vacaciones de mitad de año',detalle: 'Familias y ecoturismo hacia Pance y los Farallones.' },
  { mes: 6,  nombre: 'Vacaciones de mitad de año',detalle: 'Pico familiar: zoológico, ríos y cerros tutelares.' },
  { mes: 7,  nombre: 'Festival Petronio Álvarez', detalle: 'El mayor festival de música del Pacífico llena la ciudad.' },
  { mes: 8,  nombre: 'Mundial de Salsa',          detalle: 'Cali capital mundial de la salsa: escuelas y espectáculos.' },
  { mes: 9,  nombre: 'Temporada media',           detalle: 'Festivales culturales y turismo de fin de semana.' },
  { mes: 10, nombre: 'Puentes de noviembre',      detalle: 'Repunte moderado antes del gran pico decembrino.' },
  { mes: 11, nombre: 'Feria de Cali',             detalle: 'Del 25 al 30 de diciembre: la explosión turística del año.' },
];

/**
 * Perfiles de estacionalidad (multiplicador por mes).
 * Índice 0 = enero … 11 = diciembre.
 */
const PERFILES = {
  religioso:  [0.72, 0.74, 1.55, 1.62, 0.86, 0.94, 1.05, 1.10, 0.98, 0.92, 1.00, 1.70],
  fiesta:     [0.78, 0.70, 0.86, 0.92, 0.95, 1.05, 1.18, 1.72, 1.45, 1.02, 1.10, 2.35],
  naturaleza: [1.08, 0.82, 0.95, 1.05, 0.88, 1.48, 1.62, 1.12, 0.96, 0.98, 1.06, 1.40],
  cultural:   [0.80, 0.85, 1.02, 1.08, 1.00, 1.10, 1.22, 1.55, 1.30, 1.15, 1.05, 1.55],
  urbano:     [0.88, 0.92, 1.02, 1.04, 1.00, 1.06, 1.16, 1.28, 1.18, 1.05, 1.08, 1.60],
  mirador:    [0.95, 0.88, 1.20, 1.30, 0.95, 1.35, 1.48, 1.20, 1.05, 1.00, 1.12, 1.62],
};

export const CATEGORIAS = {
  religioso:  { nombre: 'Patrimonio religioso', color: 0xffd08a },
  fiesta:     { nombre: 'Rumba y salsa',        color: 0xff5fae },
  naturaleza: { nombre: 'Naturaleza',           color: 0x5ce6b0 },
  cultural:   { nombre: 'Cultura y museos',     color: 0x8fb4ff },
  urbano:     { nombre: 'Espacio urbano',       color: 0x9fd8ff },
  mirador:    { nombre: 'Miradores y cerros',   color: 0xc08bff },
};

/**
 * Puntos turísticos. `base` = visitantes promedio al mes en un mes neutro.
 */
export const POIS = [
  { id: 'cristo-rey',    nombre: 'Cristo Rey',                       lat: 3.4185, lon: -76.5660, cat: 'mirador',    base: 46000, alturaM: 1440,
    desc: 'Monumento de 26 m sobre el cerro de los Cristales, con vista completa del valle y la cordillera Occidental.' },
  { id: 'tres-cruces',   nombre: 'Cerro de las Tres Cruces',         lat: 3.4707, lon: -76.5470, cat: 'mirador',    base: 38000, alturaM: 1480,
    desc: 'Cerro tutelar y gimnasio al aire libre de la ciudad: sendero de ascenso y mirador sobre el norte de Cali.' },
  { id: 'la-ermita',     nombre: 'Iglesia La Ermita',                lat: 3.4527, lon: -76.5330, cat: 'religioso',  base: 52000,
    desc: 'Templo neogótico de 1942 junto al río Cali; la postal más reconocible del centro histórico.' },
  { id: 'la-merced',     nombre: 'Complejo La Merced',               lat: 3.4538, lon: -76.5343, cat: 'religioso',  base: 24000,
    desc: 'La construcción más antigua de la ciudad (1545), hoy iglesia y museo arqueológico.' },
  { id: 'plaza-caycedo', nombre: 'Plaza de Caycedo',                 lat: 3.4515, lon: -76.5324, cat: 'urbano',     base: 61000,
    desc: 'Plaza fundacional rodeada de palmas reales, la catedral de San Pedro y edificios republicanos.' },
  { id: 'san-antonio',   nombre: 'Barrio San Antonio',               lat: 3.4478, lon: -76.5389, cat: 'urbano',     base: 58000,
    desc: 'Colina colonial con capilla del siglo XVIII, cafés, calles empedradas y atardeceres sobre la ciudad.' },
  { id: 'gato-rio',      nombre: 'Gato del Río',                     lat: 3.4570, lon: -76.5391, cat: 'urbano',     base: 44000,
    desc: 'Escultura de Hernando Tejada a orillas del río Cali, acompañada por las gatas intervenidas por artistas.' },
  { id: 'la-tertulia',   nombre: 'Museo La Tertulia',                lat: 3.4487, lon: -76.5455, cat: 'cultural',   base: 21000,
    desc: 'Museo de arte moderno del suroccidente colombiano, con cinemateca junto al río.' },
  { id: 'boulevard',     nombre: 'Bulevar del Río',                  lat: 3.4540, lon: -76.5345, cat: 'urbano',     base: 72000,
    desc: 'Paseo peatonal de 980 m sobre la Avenida Colombia: el corredor turístico que cose el centro.' },
  { id: 'jairo-varela',  nombre: 'Plaza Jairo Varela',               lat: 3.4544, lon: -76.5300, cat: 'fiesta',     base: 33000,
    desc: 'Homenaje al fundador del Grupo Niche, con museo de la salsa y conciertos al aire libre.' },
  { id: 'teatro-munic',  nombre: 'Teatro Municipal',                 lat: 3.4509, lon: -76.5308, cat: 'cultural',   base: 18000,
    desc: 'Teatro Enrique Buenaventura (1918), joya republicana y sede del festival internacional de teatro.' },
  { id: 'loma-cruz',     nombre: 'Loma de la Cruz',                  lat: 3.4463, lon: -76.5370, cat: 'cultural',   base: 27000,
    desc: 'Parque artesanal con feria permanente de oficios y música en vivo al caer la tarde.' },
  { id: 'zoologico',     nombre: 'Zoológico de Cali',                lat: 3.4508, lon: -76.5563, cat: 'naturaleza', base: 68000,
    desc: 'El zoológico más visitado del país, a orillas del río Cali y con fauna del Pacífico y la Amazonía.' },
  { id: 'jardin-bot',    nombre: 'Jardín Botánico',                  lat: 3.4392, lon: -76.5637, cat: 'naturaleza', base: 12000,
    desc: 'Bosque seco tropical conservado en pleno piedemonte, con senderos de interpretación.' },
  { id: 'pance',         nombre: 'Ecoparque Río Pance',              lat: 3.3405, lon: -76.5730, cat: 'naturaleza', base: 55000,
    desc: 'Balneario natural en la entrada del Parque Nacional Farallones, destino de los fines de semana caleños.' },
  { id: 'pascual',       nombre: 'Estadio Pascual Guerrero',         lat: 3.4249, lon: -76.5424, cat: 'fiesta',     base: 40000,
    desc: 'Escenario mundialista de 1971, casa del América y el Deportivo Cali en la ciudad.' },
  { id: 'parque-perro',  nombre: 'Parque del Perro',                 lat: 3.4283, lon: -76.5449, cat: 'fiesta',     base: 47000,
    desc: 'Epicentro gastronómico y de rumba de San Fernando, activo de jueves a domingo.' },
  { id: 'canaveralejo',  nombre: 'Plaza de Toros Cañaveralejo',      lat: 3.4372, lon: -76.5501, cat: 'cultural',   base: 15000,
    desc: 'Coliseo de 1957 convertido en escenario de conciertos y de la tarima de la Feria.' },
  { id: 'acuaparque',    nombre: 'Parque de la Caña',                lat: 3.4372, lon: -76.5085, cat: 'naturaleza', base: 31000,
    desc: 'Gran parque recreativo del oriente, con acuaparque y lagos junto a la vía al Cauca.' },
  { id: 'juanchito',     nombre: 'Juanchito',                        lat: 3.4470, lon: -76.4735, cat: 'fiesta',     base: 26000,
    desc: 'Orilla del río Cauca donde nació la leyenda salsera de la ciudad: discotecas y orquestas en vivo.' },
];

/* Pequeña variación determinista por punto y mes, para que la serie no se vea
   sintéticamente perfecta. */
function jitter(id, mes) {
  let h = 0;
  const s = id + ':' + mes;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003;
  return 0.93 + (h % 1000) / 1000 * 0.14; // 0.93 … 1.07
}

/** Matriz de afluencia: { [poiId]: number[12] } */
export const AFLUENCIA = (() => {
  const out = {};
  for (const poi of POIS) {
    const perfil = PERFILES[poi.cat];
    out[poi.id] = perfil.map((w, m) => Math.round(poi.base * w * jitter(poi.id, m)));
  }
  return out;
})();

export const TOTAL_MES = MESES.map((_, m) =>
  POIS.reduce((sum, p) => sum + AFLUENCIA[p.id][m], 0),
);

export const MAX_POI = Math.max(...POIS.map((p) => Math.max(...AFLUENCIA[p.id])));
export const MIN_POI = Math.min(...POIS.map((p) => Math.min(...AFLUENCIA[p.id])));
export const MAX_TOTAL = Math.max(...TOTAL_MES);

export function visitantes(poiId, mes) {
  return AFLUENCIA[poiId][mes];
}

/** 0…1, intensidad relativa de un punto en un mes dado. */
export function intensidad(poiId, mes) {
  const v = visitantes(poiId, mes);
  return (v - MIN_POI) / (MAX_POI - MIN_POI);
}

export function mesPico(poiId) {
  const serie = AFLUENCIA[poiId];
  let best = 0;
  serie.forEach((v, m) => { if (v > serie[best]) best = m; });
  return best;
}

export function promedioAnual(poiId) {
  const serie = AFLUENCIA[poiId];
  return serie.reduce((a, b) => a + b, 0) / 12;
}

/* ------------------------------------------------------------------ */
/* Hidrografía y vías                                                   */
/* ------------------------------------------------------------------ */

export const RIOS = [
  { nombre: 'Río Cauca', ancho: 3.4, puntos: [
    [-76.4830, 3.3150], [-76.4870, 3.3500], [-76.4930, 3.3850], [-76.4880, 3.4150],
    [-76.4905, 3.4450], [-76.4860, 3.4750], [-76.4920, 3.5050], [-76.4880, 3.5250],
  ]},
  { nombre: 'Río Cali', ancho: 2.2, puntos: [
    [-76.5980, 3.4630], [-76.5820, 3.4605], [-76.5670, 3.4585], [-76.5540, 3.4545],
    [-76.5430, 3.4520], [-76.5330, 3.4545], [-76.5210, 3.4600], [-76.5060, 3.4640],
    [-76.4930, 3.4690],
  ]},
  { nombre: 'Río Pance', ancho: 1.8, puntos: [
    [-76.6020, 3.3280], [-76.5820, 3.3420], [-76.5620, 3.3560], [-76.5400, 3.3720],
    [-76.5180, 3.3880], [-76.4990, 3.4010],
  ]},
  { nombre: 'Río Meléndez', ancho: 1.6, puntos: [
    [-76.5760, 3.3880], [-76.5580, 3.3980], [-76.5400, 3.4060], [-76.5220, 3.4150],
    [-76.5020, 3.4220],
  ]},
  { nombre: 'Río Cañaveralejo', ancho: 1.5, puntos: [
    [-76.5720, 3.4200], [-76.5560, 3.4270], [-76.5400, 3.4330], [-76.5240, 3.4380],
    [-76.5060, 3.4420],
  ]},
];

export const VIAS = [
  { nombre: 'Calle 5', ancho: 2.6, puntos: [
    [-76.5560, 3.4020], [-76.5460, 3.4180], [-76.5380, 3.4330], [-76.5320, 3.4440],
    [-76.5280, 3.4520],
  ]},
  { nombre: 'Autopista Suroriental', ancho: 2.4, puntos: [
    [-76.5320, 3.3900], [-76.5230, 3.4090], [-76.5150, 3.4290], [-76.5090, 3.4480],
    [-76.5030, 3.4680],
  ]},
  { nombre: 'Avenida Colombia', ancho: 2.2, puntos: [
    [-76.5480, 3.4450], [-76.5400, 3.4500], [-76.5330, 3.4545], [-76.5260, 3.4570],
  ]},
  { nombre: 'Calle 70 / Vía al mar', ancho: 2.0, puntos: [
    [-76.5720, 3.4880], [-76.5560, 3.4820], [-76.5400, 3.4760], [-76.5220, 3.4720],
    [-76.5040, 3.4700],
  ]},
  { nombre: 'Avenida Simón Bolívar', ancho: 2.0, puntos: [
    [-76.5240, 3.4100], [-76.5120, 3.4280], [-76.5000, 3.4460], [-76.4900, 3.4620],
  ]},
  { nombre: 'Vía a Pance', ancho: 1.9, puntos: [
    [-76.5400, 3.3980], [-76.5480, 3.3800], [-76.5560, 3.3630], [-76.5660, 3.3480],
    [-76.5730, 3.3405],
  ]},
];

/** Ruta turística del centro histórico (orden de recorrido). */
export const RUTA_TURISTICA = [
  'zoologico', 'la-tertulia', 'san-antonio', 'loma-cruz', 'plaza-caycedo',
  'teatro-munic', 'la-ermita', 'la-merced', 'boulevard', 'jairo-varela', 'gato-rio',
];
