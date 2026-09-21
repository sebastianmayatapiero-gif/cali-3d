import * as THREE from 'three';
import { POIS, CATEGORIAS, visitantes } from './data.js';
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
  function update(camera, seleccionado) {
    if (!visibles) return;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    const colocadas = [];

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
