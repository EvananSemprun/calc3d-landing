import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, adapt, renderCard, formatPriceHtml } from './render.js';

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
