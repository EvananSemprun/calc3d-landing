import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, adapt, renderCard, formatPriceHtml, renderFichaHtml, metaTagsFor, jsonLdProduct, tituloFicha, inyectarFicha } from './render.js';

test('escapeHtml neutraliza < > & " \'', () => {
  assert.equal(escapeHtml('<b>"x"&\'y\''), '&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;');
});

test('adapt mapea la forma de la API a la de la vitrina', () => {
  const p = adapt({
    slug: 'llavero', name: 'Llavero', category: { slug: 'llaveros', name: 'Llaveros' },
    priceUsd: 3.5, compareAtUsd: 5, summary: 'PLA', kind: 'PHYSICAL', minQty: 2,
    material: 'PLA', badge: 'Nuevo', custom: true, leadTimeDays: 5,
    colors: [{ value: 'Rojo', swatchHex: '#f00' }],
  });
  assert.equal(p.id, 'llavero');
  assert.equal(p.price, 3.5);
  assert.equal(p.compareAt, 5);
  assert.equal(p.cat, 'llaveros');
  assert.deepEqual(p.colors, ['Rojo']);
});

test('renderCard escapa el nombre e inserta el tachado cuando hay oferta', () => {
  const p = adapt({ slug: 'x', name: 'Taza <script>', priceUsd: 10, compareAtUsd: 15, minQty: 1 });
  const html = renderCard(p, null);
  assert.ok(html.includes('Taza &lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('$15.00')); // precio tachado
});

test('formatPriceHtml sin tasa es solo USD; con tasa agrega el equivalente', () => {
  assert.ok(!formatPriceHtml(10, null).includes('price-alt'));
  const conBs = formatPriceHtml(10, { rate: 40, currencyCode: 'VES' });
  assert.ok(conBs.includes('price-alt'));
  assert.ok(conBs.includes('VES'));
});

const fichaDemo = adapt({
  slug: 'llavero', name: 'Llavero <x>', priceUsd: 10, compareAtUsd: null, minQty: 1,
  summary: 'Resumen', description: 'Descripción larga', kind: 'PHYSICAL', material: 'PLA',
  leadTimeDays: 3, badge: 'Top', custom: true,
  images: [{ url: 'https://cdn/x.jpg', alt: 'foto', width: 800, height: 800 }],
  specs: [{ label: 'Alto', value: '5cm' }],
  optionGroups: [{ name: 'Color', required: true, options: [
    { value: 'Rojo', priceDeltaUsd: 0, swatchHex: '#f00' },
    { value: 'Grande', priceDeltaUsd: 3, swatchHex: null },
  ] }],
});

test('renderFichaHtml arma el nombre (escapado), precio y specs con defaults', () => {
  const html = renderFichaHtml(fichaDemo, { rate: null });
  assert.ok(html.includes('<h1 class="h2">Llavero &lt;x&gt;</h1>'));
  assert.ok(html.includes('$10.00')); // precio base (opción Rojo = +0)
  assert.ok(html.includes('Especificaciones'));
  assert.ok(html.includes('Alto'));
  assert.ok(html.includes('pdp-opt on')); // la primera opción obligatoria arranca elegida
});

test('renderFichaHtml no rompe sin fotos ni specs ni opciones', () => {
  const simple = adapt({ slug: 's', name: 'Simple', priceUsd: 5, minQty: 1 });
  const html = renderFichaHtml(simple, {});
  assert.ok(html.includes('sin foto'));
  assert.ok(!html.includes('Especificaciones'));
});

const ctx = { siteUrl: 'https://bananolab.com', path: '/producto/llavero/' };

test('metaTagsFor: description, canonical y OG, todo escapado', () => {
  const p = adapt({ slug: 'llavero', name: 'Llavero "A"', priceUsd: 9.5, summary: 'PLA <b>', minQty: 1,
    images: [{ url: 'https://cdn/x.jpg' }] });
  const h = metaTagsFor(p, ctx);
  assert.ok(h.includes('rel="canonical" href="https://bananolab.com/producto/llavero/"'));
  assert.ok(h.includes('property="og:type" content="product"'));
  assert.ok(h.includes('PLA &lt;b&gt;'));
  assert.ok(h.includes('og:image') && h.includes('https://cdn/x.jpg'));
  assert.ok(h.includes('product:price:amount" content="9.50"'));
});

test('metaTagsFor sin foto omite og:image', () => {
  const p = adapt({ slug: 's', name: 'Simple', priceUsd: 5, minQty: 1 });
  assert.ok(!metaTagsFor(p, ctx).includes('og:image'));
});

test('jsonLdProduct arma Product con offers USD y neutraliza </script>', () => {
  const p = adapt({ slug: 'x', name: 'Taza </script>', priceUsd: 12, summary: 'desc', minQty: 1 });
  const s = jsonLdProduct(p, ctx);
  assert.ok(s.includes('"@type":"Product"'));
  assert.ok(s.includes('"priceCurrency":"USD"'));
  assert.ok(s.includes('"price":"12.00"'));
  assert.ok(s.includes('\\u003c/script>'));
  assert.ok(!s.includes('Taza </script>'));
});

test('tituloFicha', () => {
  const p = adapt({ slug: 'x', name: 'Llavero', priceUsd: 1, minQty: 1 });
  assert.equal(tituloFicha(p, 'Banano Lab'), 'Llavero — Banano Lab');
});

test('inyectarFicha no interpreta el $ del contenido (replacer function, no corrompe)', () => {
  const plantilla = '<title>Producto — Banano Lab</title>ANTES<div class="shop-state"><strong>Cargando…</strong></div>DESPUES';
  // Simula HTML ya escapado con `$` pegado a un carácter escapado (empieza con &):
  // sin replacer-function, `$&`/`$"`... se interpretan como la subcadena matcheada.
  const head = '<title>Taza $&quot;promo&quot; — Banano Lab</title>';
  const cuerpo = '<div class="pdp">precio $&lt;100 y $"especial"</div>';
  const out = inyectarFicha(plantilla, head, cuerpo);
  assert.ok(out.includes('<title>Taza $&quot;promo&quot; — Banano Lab</title>'));
  assert.ok(out.includes('<div class="pdp">precio $&lt;100 y $"especial"</div>'));
  assert.ok(!out.includes('Cargando'));
  assert.ok(out.startsWith('<title>Taza'));
  assert.ok(out.endsWith('DESPUES'));
});

import { precioConTramos } from './render.js';
test('precioConTramos aplica el mayor tramo aplicable', () => {
  const t = [{ minQty: 10, discountPct: 0.1 }, { minQty: 25, discountPct: 0.2 }];
  assert.equal(precioConTramos(10, 9, t), 10);
  assert.ok(Math.abs(precioConTramos(10, 10, t) - 9) < 1e-9);
  assert.ok(Math.abs(precioConTramos(10, 30, t) - 8) < 1e-9);
  assert.equal(precioConTramos(5, 100, []), 5);
});

import { precioUnitarioItem } from './render.js';
test('precioUnitarioItem aplica el tramo según la cantidad ACTUAL del renglón', () => {
  const prod = { price: 9.5, priceTiers: [{ minQty: 10, discountPct: 0.2 }] };
  // unit = base+opciones SIN tramo (9.5). A qty 10 → 7.60; a qty 2 → 9.50 (no congelado).
  assert.ok(Math.abs(precioUnitarioItem({ unit: 9.5, qty: 10 }, prod) - 7.6) < 1e-9);
  assert.ok(Math.abs(precioUnitarioItem({ unit: 9.5, qty: 2 }, prod) - 9.5) < 1e-9);
  // sin unit guardado, usa el precio del producto
  assert.ok(Math.abs(precioUnitarioItem({ qty: 10 }, prod) - 7.6) < 1e-9);
  // sin producto (listado viejo), no rompe
  assert.equal(precioUnitarioItem({ unit: 5, qty: 1 }, null), 5);
});

test('renderFichaHtml usa la foto de la opción elegida del grupo que define la foto', () => {
  const p = adapt({
    slug: 'x',
    name: 'X',
    priceUsd: 10,
    minQty: 1,
    images: [{ url: 'https://cdn/base.jpg' }],
    optionGroups: [
      {
        name: 'Color',
        required: true,
        drivesPhoto: true,
        options: [
          { value: 'Rojo', images: [{ url: 'https://cdn/rojo.jpg' }] },
          { value: 'Azul', images: [] },
        ],
      },
    ],
  });
  // El color elegido tiene foto propia → la galería usa esa.
  const rojo = renderFichaHtml(p, { elegido: { Color: 'Rojo' } });
  assert.ok(rojo.includes('https://cdn/rojo.jpg'));
  assert.ok(!rojo.includes('https://cdn/base.jpg'));
  // Un color sin foto propia → cae a la galería base, no se rompe.
  const azul = renderFichaHtml(p, { elegido: { Color: 'Azul' } });
  assert.ok(azul.includes('https://cdn/base.jpg'));
  assert.ok(!azul.includes('https://cdn/rojo.jpg'));
});

test('renderFichaHtml sin grupo que define la foto usa la galería base', () => {
  const p = adapt({
    slug: 'y',
    name: 'Y',
    priceUsd: 10,
    minQty: 1,
    images: [{ url: 'https://cdn/base.jpg' }],
    optionGroups: [
      {
        name: 'Color',
        required: true,
        drivesPhoto: false,
        options: [{ value: 'Rojo', images: [{ url: 'https://cdn/rojo.jpg' }] }],
      },
    ],
  });
  const html = renderFichaHtml(p, { elegido: { Color: 'Rojo' } });
  assert.ok(html.includes('https://cdn/base.jpg'));
  assert.ok(!html.includes('https://cdn/rojo.jpg'));
});
