# Cali 3D · Mapa turístico vivo

Aplicación web 3D (three.js + HTML + JavaScript, sin build ni npm) que representa
el relieve del valle de Cali y su cordillera occidental como una maqueta de
curvas de nivel iluminada con neón, con los principales puntos turísticos de la
ciudad y el flujo de visitantes a lo largo del año.

## Ejecutar

Los módulos ES necesitan `http://` (no `file://`):

```sh
python3 -m http.server 4173
# abrir http://localhost:4173
```

También está publicado con GitHub Pages desde la raíz del repositorio.

three.js r169 está vendorizado en `vendor/three/`, así que la app funciona sin
conexión (la única petición externa son las tipografías de Google Fonts, que
degradan con elegancia a la tipografía del sistema).

## Qué se ve

- **Relieve terraceado**: campo de altura procedimental del valle (≈960 m) y del
  macizo de los Farallones (hasta ≈3 800 m), cuantizado cada 120 m para lograr el
  aspecto de maqueta de curvas de nivel, con gradiente índigo → teal → violeta →
  magenta según la altitud.
- **Curvas de nivel** extraídas con *marching squares* sobre el campo continuo.
- **Hidrografía**: ríos Cauca, Cali, Pance, Meléndez y Cañaveralejo en cian.
- **Vías principales** en ámbar (Calle 5, Autopista Suroriental, Avenida
  Colombia, Calle 70, Simón Bolívar, vía a Pance).
- **Retícula urbana** de la mancha construida, orientada como la trama real.
- **Ruta turística** del centro histórico, con partículas que la recorren; su
  densidad depende de la afluencia del mes seleccionado.
- **20 puntos turísticos** con núcleo luminoso, halo, haz vertical y anillo; el
  tamaño y el brillo de cada uno responden a los visitantes de ese mes.
- **Enjambre de partículas** alrededor de cada punto: el "fluido de turistas".

## Interacción

| Acción | Control |
| --- | --- |
| Girar el mapa | arrastrar con el botón izquierdo |
| Zoom | rueda del ratón / pellizco |
| Desplazar | botón derecho o dos dedos |
| Ampliar un punto | clic sobre el punto, su etiqueta o la lista lateral |
| Acercar todavía más | botón *Acercar al punto* de la ficha |
| Cambiar de mes | barra inferior, gráfica de la ficha o ← / → |
| Animar el año | botón ▶ o barra espaciadora |
| Siguiente punto | Tab |
| Reiniciar la vista | R (Esc cierra la ficha) |
| Encender/apagar capas | panel *Capas* (botón ☰ en móvil) |
| Ver sólo el mapa | botón del ojo o H |

## Flujo de turistas por época del año

Cada punto tiene un perfil de estacionalidad (religioso, fiesta, naturaleza,
cultural, urbano, mirador) que multiplica su base mensual. Así aparecen los
picos característicos de la ciudad:

- **Semana Santa** (marzo–abril): iglesias y patrimonio religioso.
- **Vacaciones de mitad de año** (junio–julio): Pance, zoológico y cerros.
- **Festival Petronio Álvarez** (agosto) y **Mundial de Salsa** (septiembre).
- **Feria de Cali** (diciembre): el pico anual, más del doble de enero.

Al cambiar de mes se actualizan el tamaño de los puntos, los haces de luz, el
enjambre de partículas, la densidad de la ruta turística, el orden de la lista
lateral y la ficha del punto seleccionado.

> Las cifras de visitantes son una simulación coherente con la estacionalidad
> real de la ciudad, no cifras oficiales.

## Estructura

```
.
├── index.html        # interfaz y mapa de importaciones
├── styles.css        # tema oscuro, paneles de vidrio, línea de tiempo
├── src/
│   ├── config.js     # proyección lon/lat → escena, paleta, constantes
│   ├── terrain.js    # ruido, altimetría, malla terraceada, curvas de nivel
│   ├── lines.js      # ríos, vías y ruta turística (Line2 + partículas)
│   ├── data.js       # puntos turísticos, afluencia mensual, hidrografía
│   ├── pois.js       # marcadores luminosos y enjambre de turistas
│   ├── labels.js     # etiquetas HTML proyectadas, con anti-solapamiento
│   ├── ui.js         # paneles, línea de tiempo y ficha del punto
│   └── main.js       # escena, cámara, postproceso (bloom) y bucle
└── vendor/three/     # three.js r169 (módulo + addons usados)
```
