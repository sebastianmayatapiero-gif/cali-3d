/**
 * Genera las miniaturas de los dioramas que se ven sobre el mapa.
 *
 * Abre la app en un navegador, entra al visor de cada tienda que tenga modelo,
 * fotografía el lienzo y guarda `assets/miniaturas/<id>.webp`.
 *
 * Uso:
 *   python3 -m http.server 4173        # en otra terminal, desde la raíz del repo
 *   npm i -D playwright-core           # o playwright
 *   node tools/generar-miniaturas.mjs [http://localhost:4173]
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] ?? 'http://localhost:4173';
const EJECUTABLE = process.env.CHROMIUM ?? undefined; // ruta a Chromium, si hace falta
const ANCHO = 640;
const ALTO = 460;

const browser = await chromium.launch({
  executablePath: EJECUTABLE,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: ANCHO + 340, height: ALTO + 120 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction('window.__caliListo === true', { timeout: 120000 });
// La miniatura es sólo el diorama: fuera la ayuda y los botones del visor.
await page.addStyleTag({
  content: '.visor-pista,.visor-accion,.visor-progreso,.visor-estado{display:none!important}',
});

const tiendas = await page.evaluate(async () => {
  const mod = await import('./src/tiendas.js');
  return mod.TIENDAS.filter((t) => t.modelo).map((t) => ({ id: t.id, nombre: t.nombre }));
});

mkdirSync(join(RAIZ, 'assets/miniaturas'), { recursive: true });

for (const t of tiendas) {
  const fila = page.locator('#lista-tiendas .item', { hasText: t.nombre });
  await fila.click();
  // El visor baja la barra de progreso a opacidad 0 cuando termina de cargar.
  await page.waitForFunction(
    () => document.getElementById('visor-progreso').style.opacity === '0',
    { timeout: 240000 },
  );
  await page.waitForTimeout(2500); // un par de cuadros para que asiente la escena

  // Acerca la cámara: en una tarjeta pequeña el diorama tiene que llenar el marco.
  const caja = await page.locator('#visor-lienzo').boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(1800);

  const png = await page.locator('#visor-lienzo').screenshot({ timeout: 180000 });
  const webp = await page.evaluate(
    ({ datos, ancho, alto }) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = ancho; c.height = alto;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, ancho, alto);
          res(c.toDataURL('image/webp', 0.86));
        };
        img.src = datos;
      }),
    { datos: 'data:image/png;base64,' + png.toString('base64'), ancho: ANCHO, alto: ALTO },
  );

  const destino = join(RAIZ, 'assets/miniaturas', `${t.id}.webp`);
  writeFileSync(destino, Buffer.from(webp.split(',')[1], 'base64'));
  console.log('miniatura:', destino);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

await browser.close();
