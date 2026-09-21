import {
  MESES, MESES_CORTOS, TEMPORADAS, POIS, CATEGORIAS,
  AFLUENCIA, TOTAL_MES, MAX_TOTAL, visitantes, mesPico, promedioAnual,
} from './data.js';
import { formatoVisitantes } from './pois.js';
import { TIENDAS } from './tiendas.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const $ = (id) => document.getElementById(id);

const ES_EVENTO = /Feria|Festival|Semana Santa|Mundial/;

const esPantallaAngosta = () => window.matchMedia('(max-width: 860px)').matches;

export function crearUI({ onMes, onSelect, onCapa, onVolar, onPlay, onTienda }) {
  let mes = 0;
  let seleccion = null;
  let reproduciendo = false;
  // En móvil el panel arranca plegado: el mapa manda.
  let panelVisible = !esPantallaAngosta();
  let interfazVisible = true;

  /* ------------------- panel plegable y modo sólo mapa ------------------- */
  const btnMenu = $('btn-menu');
  const btnOcultar = $('btn-ocultar');
  const velo = $('velo');

  function aplicarPanel() {
    document.body.classList.toggle('sin-panel', !panelVisible);
    btnMenu.setAttribute('aria-pressed', String(panelVisible));
    // El velo sólo existe en móvil, donde el panel flota sobre el mapa.
    velo.hidden = !(panelVisible && esPantallaAngosta());
  }

  function setPanel(on) { panelVisible = on; aplicarPanel(); }

  function alternarInterfaz(on = !interfazVisible) {
    interfazVisible = on;
    document.body.classList.toggle('ui-oculta', !on);
    btnOcultar.setAttribute('aria-pressed', String(!on));
    btnOcultar.setAttribute('aria-label', on ? 'Ver sólo el mapa' : 'Mostrar la interfaz');
  }

  btnMenu.addEventListener('click', () => {
    if (!interfazVisible) alternarInterfaz(true);
    setPanel(!panelVisible);
  });
  btnOcultar.addEventListener('click', () => alternarInterfaz());
  velo.addEventListener('click', () => setPanel(false));
  window.addEventListener('resize', () => {
    if (!esPantallaAngosta()) panelVisible = true;
    aplicarPanel();
  });
  aplicarPanel();

  /* --------------------------- línea de tiempo --------------------------- */
  const contMeses = $('meses');
  const botonesMes = MESES.map((nombre, m) => {
    const b = document.createElement('button');
    b.className = 'mes';
    b.type = 'button';
    b.title = `${nombre} · ${TEMPORADAS[m].nombre}`;
    if (ES_EVENTO.test(TEMPORADAS[m].nombre)) b.classList.add('evento');
    const minTotal = Math.min(...TOTAL_MES);
    const altura = 16 + ((TOTAL_MES[m] - minTotal) / (MAX_TOTAL - minTotal)) * 84;
    b.innerHTML = `<i class="b" style="height:${altura}%"></i><span class="m">${MESES_CORTOS[m]}</span>`;
    b.addEventListener('click', () => setMes(m, true));
    contMeses.appendChild(b);
    return b;
  });

  const btnPlay = $('btn-play');
  btnPlay.addEventListener('click', () => setPlay(!reproduciendo));

  /* ------------------------------ leyenda -------------------------------- */
  const leyenda = $('leyenda');
  for (const [, cat] of Object.entries(CATEGORIAS)) {
    const s = document.createElement('span');
    s.style.setProperty('--c', hex(cat.color));
    s.innerHTML = `<i></i>${cat.nombre}`;
    leyenda.appendChild(s);
  }
  $('conteo-pois').textContent = POIS.length;

  /* --------------------------- lista de puntos --------------------------- */
  const lista = $('lista-pois');
  const items = new Map();
  for (const poi of POIS) {
    const b = document.createElement('button');
    b.className = 'item';
    b.type = 'button';
    b.style.setProperty('--c', hex(CATEGORIAS[poi.cat].color));
    b.innerHTML = `<span class="punto"></span><span class="nom">${poi.nombre}</span><span class="val"></span>`;
    b.addEventListener('click', () => onSelect(poi.id));
    b.addEventListener('mouseenter', () => b.classList.add('hover'));
    lista.appendChild(b);
    items.set(poi.id, b);
  }

  function ordenarLista() {
    const orden = [...POIS].sort(
      (a, b) => visitantes(b.id, mes) - visitantes(a.id, mes),
    );
    for (const poi of orden) {
      const el = items.get(poi.id);
      el.querySelector('.val').textContent = formatoVisitantes(visitantes(poi.id, mes));
      lista.appendChild(el); // reordena sin recrear nodos
    }
  }

  /* --------------------------- lista de tiendas -------------------------- */
  const listaTiendas = $('lista-tiendas');
  $('conteo-tiendas').textContent = TIENDAS.length;
  for (const t of TIENDAS) {
    const b = document.createElement('button');
    b.className = 'item';
    b.type = 'button';
    b.innerHTML = `<span class="punto"></span><span class="nom">${t.nombre}</span><span class="val">3D</span>`;
    b.title = `${t.oficio} · ${t.barrio}`;
    b.addEventListener('click', () => onTienda(t.id));
    listaTiendas.appendChild(b);
  }

  /* ------------------------------- capas --------------------------------- */
  const CAPAS = {
    'cap-curvas': 'curvas', 'cap-rios': 'rios', 'cap-vias': 'vias',
    'cap-reticula': 'reticula', 'cap-ruta': 'ruta', 'cap-enjambre': 'enjambre',
    'cap-tiendas': 'tiendas', 'cap-etiquetas': 'etiquetas', 'cap-giro': 'giro',
  };
  for (const [id, clave] of Object.entries(CAPAS)) {
    const input = $(id);
    input.addEventListener('change', () => onCapa(clave, input.checked));
  }

  /* -------------------------- ficha del punto ---------------------------- */
  const panelDet = $('panel-det');
  $('cerrar-det').addEventListener('click', () => onSelect(null));
  $('det-volar').addEventListener('click', () => seleccion && onVolar(seleccion));

  function pintarFicha() {
    if (!seleccion) { panelDet.classList.add('oculto'); return; }
    const poi = POIS.find((p) => p.id === seleccion);
    const cat = CATEGORIAS[poi.cat];
    const serie = AFLUENCIA[poi.id];
    const v = serie[mes];
    const prom = promedioAnual(poi.id);
    const delta = ((v - prom) / prom) * 100;
    const max = Math.max(...serie);

    panelDet.style.setProperty('--c', hex(cat.color));
    $('det-categoria').textContent = cat.nombre;
    $('det-nombre').textContent = poi.nombre;
    $('det-desc').textContent = poi.desc;
    $('det-visitantes').textContent = formatoVisitantes(v);
    $('det-mes').textContent = 'en ' + MESES[mes].toLowerCase();
    $('det-delta').textContent = (delta >= 0 ? '+' : '') + delta.toFixed(0) + ' %';
    $('det-pico').textContent = MESES[mesPico(poi.id)];
    $('det-total').textContent = formatoVisitantes(serie.reduce((a, b) => a + b, 0));

    const g = $('det-grafica');
    g.innerHTML = '';
    serie.forEach((valor, m) => {
      const col = document.createElement('div');
      col.className = 'col' + (m === mes ? ' mes-activo' : '');
      col.title = `${MESES[m]}: ${valor.toLocaleString('es-CO')} visitantes`;
      col.innerHTML = `<i class="b" style="height:${Math.max(6, (valor / max) * 100)}%"></i><span class="m">${MESES_CORTOS[m][0]}</span>`;
      col.addEventListener('click', () => setMes(m, true));
      g.appendChild(col);
    });

    panelDet.classList.remove('oculto');
  }

  /* ------------------------------- estado -------------------------------- */
  function setMes(m, avisar = false) {
    mes = ((m % 12) + 12) % 12;
    botonesMes.forEach((b, i) => b.classList.toggle('activo', i === mes));
    const t = TEMPORADAS[mes];
    $('temp-nombre').textContent = `${MESES[mes]} · ${t.nombre}`;
    $('temp-detalle').textContent = t.detalle;
    $('total-mes').textContent = TOTAL_MES[mes].toLocaleString('es-CO');
    ordenarLista();
    pintarFicha();
    if (avisar) onMes(mes);
  }

  function setSeleccion(id) {
    seleccion = id;
    document.body.classList.toggle('con-ficha', Boolean(id));
    // En móvil el cajón se cierra al elegir un punto: la ficha y el mapa bastan.
    if (id && esPantallaAngosta() && panelVisible) setPanel(false);
    for (const [poiId, el] of items) el.classList.toggle('activo', poiId === id);
    pintarFicha();
  }

  function setPlay(on) {
    reproduciendo = on;
    btnPlay.textContent = on ? '❚❚' : '▶';
    btnPlay.setAttribute('aria-label', on ? 'Pausar' : 'Reproducir el año');
    onPlay(on);
  }

  function setCapa(clave, valor) {
    const id = Object.keys(CAPAS).find((k) => CAPAS[k] === clave);
    if (id) $(id).checked = valor;
  }

  setMes(0);
  return { setMes, setSeleccion, setPlay, setCapa, setPanel, alternarInterfaz, get mes() { return mes; }, get reproduciendo() { return reproduciendo; } };
}
