import * as THREE from 'three';
import { POIS, CATEGORIAS, visitantes } from './data.js';
import { miniatura } from './tiendas.js';
import { formatoVisitantes } from './pois.js';

/**
 * Etiquetas HTML proyectadas sobre los puntos 3D. Se usa un overlay en vez de
 * sprites para tener tipografía nítida y accesible.
 */
export function crearEtiquetas(contenedor, marcadores, onSelect) {
  const items = marcadores.map(({ poi, nodo }) => {
    const el = document.createElement('button');
    el.className = 'etiqueta';
    el.dataset.poi = poi.id;
    el.style.setProperty('--cat', '#' + new THREE.Color(CATEGORIAS[poi.cat].color).getHexString());
    el.innerHTML = `
      <span class="etq-punto"></span>
      <span class="etq-texto">
        <span class="etq-nombre">${poi.nombre}</span>
        <span class="etq-cifra"></span>
      </span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); onSelect(poi.id); });
    contenedor.appendChild(el);
    return { poi, nodo, el, cifra: el.querySelector('.etq-cifra') };
  });

  const v = new THREE.Vector3();
  let mesActual = 0;
  let visibles = true;

  function setMes(mes) {
    mesActual = mes;
    for (const it of items) {
      it.cifra.textContent = formatoVisitantes(visitantes(it.poi.id, mes)) + ' vis.';
    }
  }

  function setVisibles(on) {
    visibles = on;
    contenedor.style.display = on ? '' : 'none';
  }

  /**
   * Coloca las etiquetas y evita que se solapen: se ordenan por afluencia del
   * mes (y la seleccionada primero) y se descarta la que choque con otra ya
   * colocada, como en la cartografía clásica.
   */
  function update(camera, seleccionado, ocupado = []) {
    if (!visibles) return;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    // Las tarjetas de tienda mandan: las etiquetas se apartan de su sitio.
    const colocadas = [...ocupado];

    const orden = items
      .map((it) => {
        it.nodo.getWorldPosition(v);
        v.y += 0.85;
        const dist = camera.position.distanceTo(v);
        v.project(camera);
        const dentro = v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2;
        return {
          it,
          dist,
          dentro,
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          activo: seleccionado === it.poi.id,
          peso: visitantes(it.poi.id, mesActual),
        };
      })
      .sort((a, b) => (b.activo - a.activo) || (b.peso - a.peso));

    for (const o of orden) {
      const { it } = o;
      if (!o.dentro) { ocultar(it); continue; }

      // Caja aproximada de la etiqueta en pantalla.
      const ancho = (30 + it.poi.nombre.length * 6.2) * 0.82;
      const caja = { x0: o.x - ancho / 2, x1: o.x + ancho / 2, y0: o.y - 13, y1: o.y + 13 };
      // Una etiqueta cortada por el borde estorba más de lo que informa.
      if (caja.x0 < 4 || caja.x1 > w - 4) { ocultar(it); continue; }
      const choca = colocadas.some(
        (c) => caja.x0 < c.x1 && caja.x1 > c.x0 && caja.y0 < c.y1 && caja.y1 > c.y0,
      );
      if (choca && !o.activo) { ocultar(it); continue; }
      colocadas.push(caja);

      const fade = THREE.MathUtils.clamp(1.4 - o.dist / 48, 0.2, 1);
      it.el.style.transform = `translate(-50%,-50%) translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px)`;
      it.el.style.opacity = String(o.activo ? 1 : fade);
      it.el.style.pointerEvents = 'auto';
      it.el.classList.toggle('activa', o.activo);
      it.el.style.zIndex = String(o.activo ? 40 : Math.round(1200 - o.dist * 10));
    }
  }

  function ocultar(it) {
    it.el.style.opacity = '0';
    it.el.style.pointerEvents = 'none';
    it.el.classList.remove('activa');
  }

  setMes(0);
  return { update, setMes, setVisibles, items };
}


/**
 * Tarjetas de las tiendas: la miniatura del diorama flotando sobre el punto,
 * para que se vea desde el mapa qué hay dentro. Van en el mismo overlay que
 * las etiquetas, así que compiten por el espacio con las mismas reglas.
 */
export function crearTarjetas(contenedor, marcadores, onAbrir) {
  const items = marcadores.map(({ tienda, nodo }) => {
    const el = document.createElement('button');
    el.className = 'tarjeta-tienda';
    el.type = 'button';
    el.innerHTML = `
      <img alt="Diorama de ${tienda.nombre}" loading="lazy">
      <span class="tt-pie">
        <span class="tt-nombre">${tienda.nombre}</span>
        <span class="tt-ver">Ver en 3D</span>
      </span>`;
    const img = el.querySelector('img');
    // Sin miniatura no hay tarjeta: el marcador ámbar del mapa ya señala la tienda.
    img.addEventListener('error', () => { el.classList.add('sin-foto'); });
    img.addEventListener('load', () => { el.classList.add('con-foto'); });
    img.src = miniatura(tienda.id);
    el.addEventListener('click', (ev) => { ev.stopPropagation(); onAbrir(tienda.id); });
    contenedor.appendChild(el);
    return { tienda, nodo, el };
  });

  const v = new THREE.Vector3();
  const cajas = [];
  let visibles = true;

  function setVisibles(on) {
    visibles = on;
    for (const it of items) it.el.style.display = on ? '' : 'none';
    if (!on) cajas.length = 0;
  }

  function update(camera, seleccionada) {
    cajas.length = 0;
    if (!visibles) return cajas;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;

    // Primero la seleccionada y luego las más cercanas: si dos tarjetas se
    // pisan, gana la que el usuario tiene más a mano.
    const orden = items
      .map((it) => {
        it.nodo.getWorldPosition(v);
        v.y += 1.15;
        const dist = camera.position.distanceTo(v);
        v.project(camera);
        return {
          it,
          dist,
          dentro: v.z < 1 && v.x > -1.15 && v.x < 1.15 && v.y > -1.15 && v.y < 1.15,
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          activa: seleccionada === it.tienda.id,
        };
      })
      .sort((a, b) => (b.activa - a.activa) || (a.dist - b.dist));

    for (const o of orden) {
      const it = o.it;
      const dist = o.dist;
      const dentro = o.dentro && it.el.classList.contains('con-foto');
      // De lejos taparían el mapa: entran cuando el usuario se acerca.
      const cerca = THREE.MathUtils.clamp((38 - dist) / 10, 0, 1);
      if (!dentro || cerca <= 0.02) {
        it.el.style.opacity = '0';
        it.el.style.pointerEvents = 'none';
        continue;
      }

      const activa = o.activa;
      const escala = THREE.MathUtils.clamp(1.25 - dist / 42, 0.62, 1.12) * (activa ? 1.12 : 1);
      const x = o.x;
      const y = o.y;

      const ancho0 = 168 * escala;
      const alto0 = 150 * escala;
      const caja = { x0: x - ancho0 / 2, x1: x + ancho0 / 2, y0: y - alto0, y1: y + 6 };
      const choca = cajas.some(
        (c) => caja.x0 < c.x1 && caja.x1 > c.x0 && caja.y0 < c.y1 && caja.y1 > c.y0,
      );
      if (choca) {
        it.el.style.opacity = '0';
        it.el.style.pointerEvents = 'none';
        continue;
      }

      it.el.style.transform =
        `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${escala.toFixed(3)})`;
      it.el.style.opacity = String(cerca);
      it.el.style.pointerEvents = cerca > 0.5 ? 'auto' : 'none';
      it.el.classList.toggle('activa', activa);
      cajas.push(caja);
    }
    return cajas;
  }

  return { update, setVisibles, cajas };
}
