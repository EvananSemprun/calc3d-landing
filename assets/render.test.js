import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, adapt, renderCard, formatPriceHtml, renderFichaHtml } from './render.js';

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
