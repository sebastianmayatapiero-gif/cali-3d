/**
 * Tiendas destacadas: los puntos del mapa que abren un diorama 3D navegable.
 *
 * `modelo` apunta a un .glb dentro de `assets/modelos/`. Mientras sea `null`,
 * el visor muestra un diorama de relleno para que la interacción se pueda
 * probar sin el archivo.
 *
 * Los nombres, direcciones y coordenadas de abajo son marcadores de posición:
 * cámbialos por las cinco tiendas reales.
 */

export const TIENDAS = [
  {
    id: 'carniceria-alameda',
    nombre: 'Carnicería de la Alameda',
    oficio: 'Carnicería',
    barrio: 'Galería Alameda',
    lat: 3.4287,
    lon: -76.5389,
    horario: 'Lun a sáb · 6:00 – 16:00',
    desc: 'Puesto de corte tradicional en la galería más antigua del sur, con res, cerdo y embutidos de la región.',
    modelo: 'assets/modelos/carniceria-alameda.glb',
  },
  {
    id: 'frutas-santa-elena',
    nombre: 'Frutas de Santa Elena',
    oficio: 'Frutería',
    barrio: 'Galería Santa Elena',
    lat: 3.4401,
    lon: -76.5168,
    horario: 'Todos los días · 5:00 – 15:00',
    desc: 'Montañas de fruta del Valle y del Pacífico: chontaduro, borojó, zapote y lulo recién traídos.',
    modelo: null,
  },
  {
    id: 'cafe-san-antonio',
    nombre: 'Café de San Antonio',
    oficio: 'Café de origen',
    barrio: 'San Antonio',
    lat: 3.4476,
    lon: -76.5394,
    horario: 'Mar a dom · 9:00 – 21:00',
    desc: 'Tostión local en la colina colonial, con terraza mirando el atardecer sobre la ciudad.',
    modelo: null,
  },
  {
    id: 'artesanias-loma',
    nombre: 'Artesanías Loma de la Cruz',
    oficio: 'Artesanías',
    barrio: 'Loma de la Cruz',
    lat: 3.4465,
    lon: -76.5366,
    horario: 'Todos los días · 10:00 – 22:00',
    desc: 'Talla en madera, cerámica y tejidos del suroccidente en el parque artesanal de la ciudad.',
    modelo: null,
  },
  {
    id: 'reposteria-granada',
    nombre: 'Repostería de Granada',
    oficio: 'Repostería',
    barrio: 'Granada',
    lat: 3.4576,
    lon: -76.5352,
    horario: 'Lun a sáb · 7:00 – 20:00',
    desc: 'Pandebono, aborrajado y manjar blanco hechos en el día, en el barrio gastronómico del norte.',
    modelo: null,
  },
];

export const COLOR_TIENDA = 0xffb03a;

/** Miniatura que se muestra flotando sobre el punto en el mapa. */
export function miniatura(id) {
  return `assets/miniaturas/${id}.webp`;
}

export function tienda(id) {
  return TIENDAS.find((t) => t.id === id) ?? null;
}
