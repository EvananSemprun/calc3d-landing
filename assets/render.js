// Módulo de render PURO: sin DOM, sin window. Fuente ÚNICA del markup, usada por
// el navegador (app.js) y por el build (vite.config.ts) para que no diverjan.
//
// Los nombres y descripciones los escribe el dueño en el panel, pero igual se
// escapan: el HTML se arma con plantillas, y un `<` suelto rompería la vitrina.

export function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
export function escapeAttr(s) {
  return escapeHtml(s);
}

/**
 * Traduce un producto de la API a la forma que usa la vitrina. El precio queda
 * en USD (la base del sistema); los bolívares se calculan al mostrar.
 */
export function adapt(p) {
  // La API ya entrega los colores listos en `colors` (tanto en la tarjeta como
  // en la ficha): son las opciones del grupo "Color" que tienen muestra.
  const colorList = (p.colors ?? []).map((c) => ({ value: c.value, hex: c.swatchHex }));

  return {
    id: p.slug,
    name: p.name,
    cat: p.category?.slug ?? '',
    catLabel: p.category?.name ?? '',
    price: p.priceUsd,
    compareAt: p.compareAtUsd,
    desc: p.summary ?? '',
    kind: p.kind,
    minQty: p.minQty,
    material: p.material ?? null,
    // Clave para comparar en el filtro (ver materialesDe).
    materialKey: (p.material ?? '').trim().toLowerCase(),
    badge: p.badge ?? null,
    custom: !!p.custom,
    requiresOptions: !!p.requiresOptions,
    specs: p.specs ?? [],
    ship: p.leadTimeDays != null ? `${p.leadTimeDays} días` : null,
    image: p.image ?? (p.images ? p.images[0] : null),
    // Solo presentes en la ficha individual:
    images: p.images ?? null,
    description: p.description ?? null,
    optionGroups: p.optionGroups ?? [],
    colorList,
    colors: colorList.map((c) => c.value),
  };
}

/** Precio USD con el equivalente en la moneda de la tasa (o solo USD si no hay). */
export function formatPriceHtml(usd, rate) {
  const base = `$${usd.toFixed(2)}<small> USD</small>`;
  if (!rate) return base;
  const alt = (usd * rate.rate).toLocaleString('es-VE', { maximumFractionDigits: 2 });
  return `${base}<span class="price-alt">≈ ${alt} ${rate.currencyCode}</span>`;
}

/**
 * Tarjeta de producto. La usan la vitrina, los relacionados de la ficha y los
 * destacados del inicio: tres copias divergentes de esto era cuestión de tiempo.
 * `rate` es la tasa vigente para el precio (null = solo USD).
 */
export function renderCard(p, rate) {
  const foto = p.image
    ? `<img class="product-photo" src="${escapeAttr(p.image.url)}" alt="${escapeAttr(p.image.alt || p.name)}" loading="lazy"${p.image.width ? ` width="${p.image.width}" height="${p.image.height}"` : ''}>`
    : '<div class="ph" data-label="sin foto"></div>';
  const insignias = [
    p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : '',
    p.compareAt && p.compareAt > p.price ? '<span class="badge badge-green">Oferta</span>' : '',
    p.custom ? '<span class="badge badge-soft">Personalizable</span>' : '',
  ].filter(Boolean).join('');
  const swatches = p.colorList.length
    ? `<div class="swatches">${p.colorList.map((c) => `<span class="swatch" style="background:${escapeAttr(c.hex)}" title="${escapeAttr(c.value)}"></span>`).join('')}</div>`
    : '';
  const linea = [p.catLabel, p.material].filter(Boolean).map(escapeHtml).join(' • ');
  const entrega = p.ship ? `<span class="mono dim" style="font-size:12px">Listo en ${escapeHtml(p.ship)}</span>` : '';
  const minimo = p.minQty > 1 ? `<span class="mono dim" style="font-size:12px">Mínimo ${p.minQty}</span>` : '';
  const tachado = p.compareAt && p.compareAt > p.price
    ? `<s class="dim mono" style="font-size:13px;margin-left:6px">$${p.compareAt.toFixed(2)}</s>` : '';

  return `<article class="card product">
    <a class="product-media" href="/producto/${escapeAttr(p.id)}" aria-label="Ver ${escapeAttr(p.name)}">
      ${foto}
      <div class="product-badges">${insignias}</div>
    </a>
    <div class="product-body">
      <div class="product-top">
        <h3><a href="/producto/${escapeAttr(p.id)}">${escapeHtml(p.name)}</a></h3>
        ${p.kind === 'SERVICE' ? '<span class="badge badge-soft">Servicio</span>' : ''}
      </div>
      ${linea ? `<p class="product-line mono">${linea}</p>` : ''}
      ${p.desc ? `<p class="product-desc">${escapeHtml(p.desc)}</p>` : ''}
      <div class="product-meta">${swatches}${entrega}${minimo}</div>
      <div class="product-foot">
        <span class="price">${formatPriceHtml(p.price, rate)}${tachado}</span>
        <div class="product-actions">
          <a class="btn btn-ghost btn-sm" href="/producto/${escapeAttr(p.id)}">Ver detalle</a>
          <button class="add-btn" data-add="${escapeAttr(p.id)}" aria-label="${p.requiresOptions ? `Elegir opciones de ${escapeAttr(p.name)}` : `Agregar ${escapeAttr(p.name)} al pedido`}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> ${p.requiresOptions ? 'Elegir' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  </article>`;
}
