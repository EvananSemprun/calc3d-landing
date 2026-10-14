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

/**
 * Cuerpo de la ficha de producto (el innerHTML de `#pdp`). Puro: lo usa el
 * cliente (producto/index.html) con el estado interactivo, y el build con los
 * defaults. `opts.elegido` = opción elegida por grupo (default: la primera de
 * cada grupo obligatorio), `opts.cantidad` (default minQty||1), `opts.fotoActiva`
 * (default 0), `opts.rate` (tasa para el precio, default null).
 */
export function renderFichaHtml(p, { elegido, cantidad, fotoActiva = 0, rate = null } = {}) {
  const elegidas = elegido ?? Object.fromEntries(
    (p.optionGroups ?? [])
      .filter((g) => g.required && g.options.length)
      .map((g) => [g.name, g.options[0].value]),
  );
  const cant = cantidad ?? (p.minQty || 1);
  let precio = p.price;
  for (const g of p.optionGroups ?? []) {
    const op = g.options.find((o) => o.value === elegidas[g.name]);
    if (op) precio += op.priceDeltaUsd || 0;
  }

  const fotos = p.images ?? (p.image ? [p.image] : []);
  const principal = fotos[fotoActiva];

  const galeria = `
      <div class="pdp-gallery">
        ${principal
          ? `<img class="pdp-main" src="${escapeAttr(principal.url)}" alt="${escapeAttr(principal.alt || p.name)}">`
          : `<div class="ph pdp-main" data-label="sin foto"></div>`}
        ${fotos.length > 1
          ? `<div class="pdp-thumbs">${fotos.map((f, i) =>
              `<img class="pdp-thumb${i === fotoActiva ? ' on' : ''}" data-foto="${i}" src="${escapeAttr(f.url)}" alt="${escapeAttr(f.alt || '')}">`).join('')}</div>`
          : ''}
      </div>`;

  const insignias = [
    p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : '',
    p.custom ? `<span class="badge badge-soft">Personalizable</span>` : '',
    p.kind === 'SERVICE' ? `<span class="badge badge-soft">Servicio</span>` : '',
  ].filter(Boolean).join('');

  const hechos = [
    p.catLabel ? escapeHtml(p.catLabel) : '',
    p.material ? escapeHtml(p.material) : '',
    p.ship ? `Listo en ${escapeHtml(p.ship)}` : '',
    p.minQty > 1 ? `Mínimo ${p.minQty}` : '',
  ].filter(Boolean).map((h) => `<span>${h}</span>`).join('<span class="dim">·</span>');

  const grupos = (p.optionGroups ?? []).map((g) => `
      <div class="pdp-opt-group">
        <h4>${escapeHtml(g.name)}${g.required ? '' : ' (opcional)'}</h4>
        <div class="pdp-opts" data-grupo="${escapeAttr(g.name)}">
          ${g.options.map((o) => `
            <button class="pdp-opt${elegidas[g.name] === o.value ? ' on' : ''}" data-opt="${escapeAttr(o.value)}">
              ${o.swatchHex ? `<i style="background:${escapeAttr(o.swatchHex)}"></i>` : ''}${escapeHtml(o.value)}${o.priceDeltaUsd ? ` +$${o.priceDeltaUsd.toFixed(2)}` : ''}
            </button>`).join('')}
        </div>
      </div>`).join('');

  const specs = (p.specs ?? []).length
    ? `<table class="pdp-specs"><tbody>${p.specs.map((e) =>
        `<tr><th scope="row">${escapeHtml(e.label)}</th><td>${escapeHtml(e.value)}</td></tr>`).join('')}</tbody></table>`
    : '';

  return `
      <div class="pdp">
        ${galeria}
        <div class="pdp-info">
          ${insignias ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${insignias}</div>` : ''}
          <h1 class="h2">${escapeHtml(p.name)}</h1>
          ${hechos ? `<div class="pdp-facts">${hechos}</div>` : ''}
          <div class="pdp-price">${formatPriceHtml(precio, rate)}</div>
          ${p.desc ? `<p class="lead" style="font-size:17px">${escapeHtml(p.desc)}</p>` : ''}
          ${grupos}
          <div class="pdp-buy">
            <div class="qty">
              <button data-cant="-1" aria-label="menos">–</button>
              <span id="cantVal">${cant}</span>
              <button data-cant="1" aria-label="más">+</button>
            </div>
            <button class="btn btn-primary" id="agregar">Agregar al pedido</button>
          </div>
          ${p.description ? `<div class="pdp-desc">${escapeHtml(p.description)}</div>` : ''}
          ${specs ? `<div><h3 class="h3" style="margin-top:10px;font-size:20px">Especificaciones</h3>${specs}</div>` : ''}
        </div>
      </div>`;
}
