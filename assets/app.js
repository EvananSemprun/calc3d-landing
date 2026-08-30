/* ============================================================
   BANANO LAB — lógica compartida de la tienda
   Carrito (localStorage), nav móvil, reveal al hacer scroll y
   carga del catálogo desde la API pública de Calc3D.

   Diferencias con el prototipo de Claude Design, y por qué:

   1. El catálogo NO está escrito acá. Viene de `/public/store/*`, que es lo que
      administra el panel. Un catálogo duplicado en el front se desactualiza el
      primer día.
   2. NO hay "Finalizar compra". El prototipo tenía un `alert()` de demo que
      prometía una pasarela de pago; el pedido se cierra por WhatsApp, que es lo
      acordado. Dejar el botón sería ofrecerle al cliente algo que no existe.
   3. Los colores del filtro salen de los productos reales, no de una lista fija
      de tres.
   ============================================================ */

const API = (import.meta?.env?.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

/* ---------- Estado del catálogo (lo llena la API) ---------- */
const BL = {
  ready: false,
  error: null,
  /** Ficha del negocio: nombre, teléfono de WhatsApp, tasa de presentación. */
  info: { businessName: 'Banano Lab', whatsappPhone: null, currency: 'USD', rate: null },
  products: [],
  cats: [],
  /** { "Rojo": "#FF0000", … } armado con los colores que de verdad se usan. */
  colors: {},
  /** [{ key: "pla", label: "PLA" }, …] con los materiales que de verdad se usan. */
  materials: [],

  async load() {
    const [info, cats, products] = await Promise.all([
      fetchJson('/public/store/info'),
      fetchJson('/public/store/categories'),
      fetchJson('/public/store/products'),
    ]);
    this.info = info;
    this.cats = cats.categories.map((c) => ({ key: c.slug, label: c.name }));
    this.products = products.products.map(adapt);
    this.colors = {};
    for (const p of this.products) {
      for (const c of p.colorList) this.colors[c.value] = c.hex;
    }
    this.materials = materialesDe(this.products);
    this.ready = true;
    return this;
  },

  find(id) {
    return this.products.find((p) => p.id === id) ?? null;
  },
};

/**
 * Materiales presentes en el catálogo, para armar el filtro.
 *
 * El campo es TEXTO LIBRE en el panel (hay un datalist con sugerencias, pero
 * nada obliga a usarlo), así que "PLA", "pla" y " PLA " llegan como tres
 * valores distintos. Se deduplica sin distinguir mayúsculas ni espacios y se
 * muestra la primera forma que aparece; si no, el filtro tendría tres botones
 * para el mismo material y cada uno mostraría un tercio de los productos.
 */
function materialesDe(products) {
  const vistos = new Map();
  for (const p of products) {
    if (!p.materialKey || vistos.has(p.materialKey)) continue;
    vistos.set(p.materialKey, p.material.trim());
  }
  return [...vistos].map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

async function fetchJson(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  return res.json();
}

/**
 * POST a la API pública. Devuelve el mensaje de error del backend cuando lo hay
 * ("Falta elegir Tamaño", "se pide de a 2 como mínimo"): son cosas que el
 * cliente puede corregir, y tragárselas dejaría un "algo salió mal" inútil.
 */
async function postJson(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(msg || `La API respondió ${res.status}`);
  }
  return data;
}

/**
 * Manda el pedido a la bandeja del negocio. **El precio NO va acá**: solo qué
 * producto y qué opciones. El servidor lee la ficha, valida las opciones y
 * calcula el total — si el precio viajara desde el navegador, cualquiera lo
 * editaría antes de mandarlo.
 */
BL.submitOrder = function submitOrder(customer, items) {
  return postJson('/public/store/orders', { customer, items });
};

BL.submitCustom = function submitCustom(customer, description) {
  return postJson('/public/store/custom-requests', { customer, description });
};

/**
 * Traduce un producto de la API a la forma que usa la vitrina. El precio queda
 * en USD (la base del sistema); los bolívares se calculan al mostrar.
 */
function adapt(p) {
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

/** Ficha completa de un producto, por su enlace. */
async function fetchProduct(slug) {
  return adapt(await fetchJson(`/public/store/products/${encodeURIComponent(slug)}`));
}

/** Precio formateado en USD, con el equivalente en la moneda de la tasa. */
function formatPrice(usd) {
  const base = `$${usd.toFixed(2)}<small> USD</small>`;
  const r = BL.info.rate;
  if (!r) return base;
  const alt = (usd * r.rate).toLocaleString('es-VE', { maximumFractionDigits: 2 });
  return `${base}<span class="price-alt">≈ ${alt} ${r.currencyCode}</span>`;
}

/* ---------- Carrito ----------
   Es un armador de pedido, no una caja: junta lo que el cliente quiere y termina
   en un mensaje de WhatsApp. No cobra ni guarda datos personales. */
const Cart = {
  key: 'bl_cart_v1',
  read() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch {
      return [];
    }
  },
  write(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.render();
    window.dispatchEvent(new Event('cart:change'));
  },
  /**
   * Agrega al pedido. `opts` son las opciones elegidas ({ Color: 'Rojo' }); se
   * guardan junto al renglón porque **cambian el precio**: sin ellas el carrito
   * cotizaría el precio base y el cliente recibiría un total equivocado.
   *
   * Dos renglones del mismo producto con opciones distintas son cosas distintas,
   * así que se agrupan por producto + opciones.
   */
  add(id, qty, opts, unit) {
    const p = BL.find(id);
    if (!p) return;
    const elegidas = opts ?? {};
    const clave = claveDeItem(id, elegidas);
    const items = this.read();
    const found = items.find((i) => claveDeItem(i.id, i.opts ?? {}) === clave);
    const paso = qty ?? p.minQty ?? 1;
    // El precio unitario lo manda quien lo sabe: la FICHA, que es la única que
    // tiene los grupos de opciones. `BL.products` viene del listado y no los
    // trae, así que calcularlo acá daría siempre el precio base.
    const precio = unit ?? unitPrice(p, elegidas);
    if (found) found.qty += paso;
    else items.push({ id, qty: paso, opts: elegidas, unit: precio });
    this.write(items);
    this.flash();
    this.open();
  },
  setQty(clave, qty) {
    let items = this.read();
    const item = items.find((i) => claveDeItem(i.id, i.opts ?? {}) === clave);
    if (!item) return;
    const min = BL.find(item.id)?.minQty ?? 1;
    if (qty < min) items = items.filter((i) => i !== item);
    else item.qty = qty;
    this.write(items);
  },
  remove(clave) {
    this.write(this.read().filter((i) => claveDeItem(i.id, i.opts ?? {}) !== clave));
  },
  count() {
    return this.read().reduce((n, i) => n + i.qty, 0);
  },
  total() {
    return this.read().reduce((s, i) => s + precioDeItem(i) * i.qty, 0);
  },
  flash() {
    const btn = document.querySelector('.cart-btn');
    if (!btn || !btn.animate) return;
    btn.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
      { duration: 360, easing: 'cubic-bezier(.22,.61,.36,1)' },
    );
  },

  /** Arma el mensaje del pedido. Es lo único que "cierra" la compra. */
  whatsappUrl() {
    const items = this.read();
    const lineas = items
      .map((i) => {
        const p = BL.find(i.id);
        if (!p) return null;
        const detalle = describeOpts(i.opts);
        return `• ${i.qty} × ${p.name}${detalle ? ` (${detalle})` : ''} — $${precioDeItem(i).toFixed(2)} c/u`;
      })
      .filter(Boolean);
    const total = this.total();
    const quien = Checkout.datos.name ? `soy ${Checkout.datos.name} y ` : '';
    let msg = `Hola ${BL.info.businessName}, ${quien}quiero hacer este pedido:\n\n${lineas.join('\n')}\n\nTotal: $${total.toFixed(2)} USD`;
    if (BL.info.rate) {
      const alt = (total * BL.info.rate.rate).toLocaleString('es-VE', { maximumFractionDigits: 2 });
      msg += `\n(≈ ${alt} ${BL.info.rate.currencyCode} a la tasa de hoy)`;
    }
    // Teléfono a formato internacional: sin separadores; el 0 inicial de
    // Venezuela se reemplaza por el código de país.
    const crudo = (BL.info.whatsappPhone ?? '').replace(/\D/g, '');
    const tel = crudo.startsWith('0') ? `58${crudo.slice(1)}` : crudo;
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  },

  render() {
    document.querySelectorAll('.cart-count').forEach((el) => {
      const c = this.count();
      el.textContent = c;
      el.style.display = c ? 'grid' : 'none';
    });
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;
    const body = drawer.querySelector('.cart-items');
    const items = this.read();

    if (!items.length) {
      body.innerHTML = `<div class="cart-empty"><p class="dim">Tu carrito está vacío.</p></div>`;
    } else {
      body.innerHTML = items
        .map((i) => {
          const p = BL.find(i.id);
          if (!p) return '';
          const clave = claveDeItem(i.id, i.opts ?? {});
          const detalle = describeOpts(i.opts);
          const foto = p.image
            ? `<img src="${escapeAttr(p.image.url)}" alt="" style="width:64px;height:64px;flex:none;border-radius:12px;object-fit:cover">`
            : `<div class="ph" data-label="sin foto" style="width:64px;height:64px;flex:none;border-radius:12px"></div>`;
          return `<div class="cart-row">
          ${foto}
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-family:var(--font-display)">${escapeHtml(p.name)}</div>
            ${detalle ? `<div class="dim" style="font-size:12.5px">${escapeHtml(detalle)}</div>` : ''}
            <div class="mono" style="font-size:13px;color:var(--yellow)">$${precioDeItem(i).toFixed(2)} USD</div>
            <div class="qty" style="margin-top:8px">
              <button onclick="Cart.setQty('${escapeAttr(clave)}',${i.qty - 1})" aria-label="menos">–</button>
              <span>${i.qty}</span>
              <button onclick="Cart.setQty('${escapeAttr(clave)}',${i.qty + 1})" aria-label="más">+</button>
              <button class="cart-del" onclick="Cart.remove('${escapeAttr(clave)}')" aria-label="quitar">Quitar</button>
            </div>
          </div>
        </div>`;
        })
        .join('');
    }

    const totalEl = drawer.querySelector('.cart-total-val');
    if (totalEl) totalEl.textContent = `$${this.total().toFixed(2)} USD`;
    const foot = drawer.querySelector('.cart-foot');
    // Tras enviar, el pie sigue a la vista aunque el carrito quede vacío: ahí
    // está el botón para confirmar por WhatsApp.
    if (foot) foot.style.display = items.length || Checkout.hecho ? 'block' : 'none';
    const wa = drawer.querySelector('.cart-wa');
    if (wa && items.length) {
      wa.href = this.whatsappUrl();
      // Sin teléfono configurado el botón no puede cumplir: se deshabilita en
      // vez de abrir un enlace roto.
      const hayTel = !!BL.info.whatsappPhone;
      wa.style.pointerEvents = hayTel ? '' : 'none';
      wa.style.opacity = hayTel ? '' : '.5';
      wa.title = hayTel ? '' : 'Falta cargar el teléfono del negocio en Ajustes → Negocio';
    }
  },
  open() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
  },
  close() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
    // El pedido ya se envió: vaciar acá (y no al enviar) deja el mensaje de
    // WhatsApp armado mientras el cliente todavía lo está por tocar.
    if (Checkout.hecho) Checkout.reiniciar();
  },
};

/** Identidad de un renglón: mismo producto con OTRAS opciones es otro renglón. */
function claveDeItem(id, opts) {
  const partes = Object.keys(opts ?? {}).sort().map((k) => `${k}=${opts[k]}`);
  return partes.length ? `${id}|${partes.join('|')}` : id;
}

/** Precio unitario con los recargos de las opciones elegidas. */
function unitPrice(p, opts) {
  let total = p.price;
  for (const g of p.optionGroups ?? []) {
    const op = g.options.find((o) => o.value === (opts ?? {})[g.name]);
    if (op) total += op.priceDeltaUsd || 0;
  }
  return total;
}

/** Precio del renglón guardado. Se congeló al agregarlo, así que sobrevive a que
 *  el listado (que no trae los grupos de opciones) no pueda recalcularlo. */
function precioDeItem(i) {
  if (typeof i.unit === 'number') return i.unit;
  return BL.find(i.id)?.price ?? 0;
}

/** "Color: Rojo · Tamaño: Grande" */
function describeOpts(opts) {
  return Object.entries(opts ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
}

/* ---------- Escapes ----------
   Los nombres y descripciones los escribe el dueño en el panel, pero igual se
   escapan: el HTML se arma con plantillas, y un `<` suelto rompería la vitrina. */
function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
function escapeAttr(s) {
  return escapeHtml(s);
}

/* ---------- Nav móvil ---------- */
function blToggleNav() {
  document.querySelector('.nav-links')?.classList.toggle('open');
}

/* ---------- Reveal al hacer scroll (mejora progresiva) ---------- */
function blInitReveal() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!els.length) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) {
    document.documentElement.classList.remove('reveal-on');
    return;
  }
  document.documentElement.classList.add('reveal-on');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -10% 0px' },
  );
  els.forEach((e) => io.observe(e));
  setTimeout(() => document.documentElement.classList.remove('reveal-on'), 1100);
}

/* ---------- Cajón del carrito (se inyecta) ---------- */
function blInjectCart() {
  if (document.getElementById('cartDrawer')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="cartOverlay" class="cart-overlay" onclick="Cart.close()"></div>
    <aside id="cartDrawer" class="cart-drawer" aria-label="Carrito">
      <div class="cart-head">
        <strong style="font-family:var(--font-display);font-size:19px">Tu pedido</strong>
        <button class="cart-x" onclick="Cart.close()" aria-label="cerrar">✕</button>
      </div>
      <div class="cart-items"></div>
      <div class="cart-foot">
        <div class="cart-total"><span class="dim">Total</span><span class="cart-total-val">$0.00 USD</span></div>
        <form class="checkout" id="checkoutForm" novalidate>
          <label>Tu nombre<input name="name" autocomplete="name" maxlength="80" required></label>
          <label>Tu WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="0412 1234567" required></label>
          <label>Algo que debamos saber <span class="dim">(opcional)</span><textarea name="note" rows="2" maxlength="500"></textarea></label>
          <p class="checkout-error" id="checkoutError" hidden></p>
          <button class="btn btn-primary btn-block" type="submit" id="checkoutSend">Enviar pedido</button>
        </form>
        <div class="checkout-done" id="checkoutDone" hidden>
          <strong>Recibimos tu pedido</strong>
          <p class="dim">Ya está en nuestra bandeja. Confirmalo por WhatsApp y coordinamos pago y entrega.</p>
        </div>
        <a href="#" class="btn btn-wa btn-block cart-wa" target="_blank" rel="noopener" hidden>
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.515 5.26l-.999 3.648 3.973-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          Pedir por WhatsApp
        </a>
        <p class="dim" style="font-size:12px;margin:10px 0 0;text-align:center">
          Coordinamos el pago y la entrega por WhatsApp.
        </p>
      </div>
    </aside>`;
  document.body.appendChild(wrap);
  Cart.render();
}


/* ---------- Envío del pedido ----------
   Este es el único punto del repo que ESCRIBE en la API. Dos reglas de diseño:

   1. **El precio no se manda.** Solo `{slug, qty, options}`. El total lo calcula
      el servidor leyendo la ficha; lo que muestre esta página es informativo.
   2. **Nunca se pierde la venta.** Si guardar falla, igual se ofrece el botón de
      WhatsApp: perder un pedido por un error del servidor es peor que quedarse
      sin el registro. Y al revés, el pedido queda guardado aunque el cliente
      cierre la pestaña sin llegar a WhatsApp. */
const Checkout = {
  datos: { name: '', phone: '', note: '' },
  enviando: false,
  hecho: false,

  /** Valida en el navegador lo mismo que exige el contrato, para no gastar un
   *  viaje (y una de las 5 solicitudes por minuto) en un nombre vacío. */
  validar(d) {
    if (!d.name || d.name.length < 2) return 'Escribí tu nombre.';
    if ((d.phone.match(/\d/g) ?? []).length < 7) return 'Escribí un WhatsApp válido.';
    return null;
  },

  leerFormulario(form) {
    const fd = new FormData(form);
    return {
      name: String(fd.get('name') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      note: String(fd.get('note') ?? '').trim(),
    };
  },

  async enviarPedido(ev) {
    ev.preventDefault();
    if (this.enviando) return;
    const error = document.getElementById('checkoutError');
    const boton = document.getElementById('checkoutSend');
    const datos = this.leerFormulario(ev.target);

    const problema = this.validar(datos);
    if (problema) return mostrarError(error, problema);

    const items = Cart.read().map((i) => ({ slug: i.id, qty: i.qty, options: i.opts ?? {} }));
    if (!items.length) return mostrarError(error, 'Tu carrito está vacío.');

    this.datos = datos;
    this.enviando = true;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    error.hidden = true;

    try {
      const customer = { name: datos.name, phone: datos.phone };
      if (datos.note) customer.note = datos.note;
      await BL.submitOrder(customer, items);
      this.mostrarHecho();
    } catch (e) {
      console.error(e);
      // Se muestra el motivo real (suele ser corregible: falta elegir un tamaño,
      // no llega al mínimo) y se deja igual el camino de WhatsApp: la venta no
      // se cae por un fallo nuestro.
      mostrarError(error, conPunto(e.message) + ' Podés mandarlo igual por WhatsApp.');
      this.mostrarWhatsapp();
    } finally {
      this.enviando = false;
      boton.disabled = false;
      boton.textContent = 'Enviar pedido';
    }
  },

  mostrarWhatsapp() {
    const wa = document.querySelector('#cartDrawer .cart-wa');
    if (!wa) return;
    wa.href = Cart.whatsappUrl();
    wa.hidden = false;
  },

  mostrarHecho() {
    this.hecho = true;
    document.getElementById('checkoutForm').hidden = true;
    document.getElementById('checkoutDone').hidden = false;
    this.mostrarWhatsapp();
  },

  /** Vuelve al estado inicial y vacía el carrito ya pedido. */
  reiniciar() {
    this.hecho = false;
    this.datos = { name: '', phone: '', note: '' };
    const form = document.getElementById('checkoutForm');
    if (form) { form.reset(); form.hidden = false; }
    const hecho = document.getElementById('checkoutDone');
    if (hecho) hecho.hidden = true;
    const wa = document.querySelector('#cartDrawer .cart-wa');
    if (wa) wa.hidden = true;
    Cart.write([]);
  },
};

function mostrarError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

/** Los mensajes del backend no traen punto final; sin esto quedaban pegados a
 *  la frase que se les concatena ("...como mínimo Podés mandarlo..."). */
function conPunto(msg) {
  const limpio = String(msg ?? '').trim();
  return /[.!?]$/.test(limpio) ? limpio : limpio + '.';
}

/* ---------- Pieza a medida ----------
   Los enlaces "Cotizar a medida" YA apuntan a WhatsApp. El modal los intercepta
   cuando hay JS; si algo falla, el enlace original sigue funcionando. Por eso va
   con delegación y `preventDefault`, y no reescribiendo el href. */
function blInjectCustomModal() {
  if (document.getElementById('customModal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = [
    '<div id="customOverlay" class="cart-overlay" onclick="Custom.close()"></div>',
    '<div id="customModal" class="custom-modal" role="dialog" aria-modal="true" aria-labelledby="customTitle" hidden>',
    '  <div class="cart-head">',
    '    <strong id="customTitle" style="font-family:var(--font-display);font-size:19px">Cotizar una pieza a medida</strong>',
    '    <button class="cart-x" onclick="Custom.close()" aria-label="cerrar">&#10005;</button>',
    '  </div>',
    '  <form class="checkout" id="customForm" novalidate>',
    '    <p class="dim" style="font-size:13.5px;margin:0">Contanos qué necesitás y te pasamos un precio. Sin compromiso.</p>',
    '    <label>Tu nombre<input name="name" autocomplete="name" maxlength="80" required></label>',
    '    <label>Tu WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="0412 1234567" required></label>',
    '    <label>Qué necesitás<textarea name="description" rows="4" maxlength="2000" placeholder="Medidas, cantidad, color, para cuándo…" required></textarea></label>',
    '    <p class="checkout-error" id="customError" hidden></p>',
    '    <button class="btn btn-primary btn-block" type="submit" id="customSend">Enviar consulta</button>',
    '  </form>',
    '  <div class="checkout-done" id="customDone" hidden>',
    '    <strong>Recibimos tu consulta</strong>',
    '    <p class="dim">Te escribimos con el precio. Si querés adelantar, mandanos un WhatsApp.</p>',
    '    <a href="#" class="btn btn-wa btn-block" id="customWa" target="_blank" rel="noopener">Escribir por WhatsApp</a>',
    '  </div>',
    '</div>',
  ].join('');
  document.body.appendChild(wrap);
  document.getElementById('customForm').addEventListener('submit', (e) => Custom.enviar(e));
}

const Custom = {
  enviando: false,
  /**
   * Abre el modal. `prefill` deja precargada la descripcion y cambiar el titulo:
   * lo usa el estimador para mandar el detalle ya redactado, para que nadie
   * tenga que volver a escribir lo que acaba de elegir.
   */
  open(prefill = {}) {
    const modal = document.getElementById('customModal');
    modal.hidden = false;
    document.getElementById('customOverlay').classList.add('open');
    if (prefill.titulo) document.getElementById('customTitle').textContent = prefill.titulo;
    const desc = document.querySelector('#customForm textarea[name="description"]');
    if (prefill.description && desc) desc.value = prefill.description;
    // Con la descripcion ya puesta, lo que falta es el contacto: ahi va el foco.
    document.querySelector('#customForm input[name="name"]')?.focus();
  },
  close() {
    document.getElementById('customModal').hidden = true;
    document.getElementById('customOverlay').classList.remove('open');
  },
  async enviar(ev) {
    ev.preventDefault();
    if (this.enviando) return;
    const error = document.getElementById('customError');
    const boton = document.getElementById('customSend');
    const fd = new FormData(ev.target);
    const datos = {
      name: String(fd.get('name') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
    };

    const problema =
      Checkout.validar(datos) ||
      (datos.description.length < 10 ? 'Contanos un poco más de lo que necesitás.' : null);
    if (problema) return mostrarError(error, problema);

    this.enviando = true;
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    error.hidden = true;
    try {
      await BL.submitCustom({ name: datos.name, phone: datos.phone }, datos.description);
      document.getElementById('customForm').hidden = true;
      document.getElementById('customDone').hidden = false;
      document.getElementById('customWa').href = enlaceDeConsulta(datos);
    } catch (e) {
      console.error(e);
      mostrarError(error, conPunto(e.message) + ' Podés escribirnos por WhatsApp.');
    } finally {
      this.enviando = false;
      boton.disabled = false;
      boton.textContent = 'Enviar consulta';
    }
  },
};

function enlaceDeConsulta(datos) {
  const crudo = (BL.info.whatsappPhone ?? '').replace(/\D/g, '');
  const tel = crudo.startsWith('0') ? '58' + crudo.slice(1) : crudo;
  const msg = 'Hola ' + BL.info.businessName + ', soy ' + datos.name + '. ' + datos.description;
  return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg);
}


/* ---------- Cromo compartido ----------
   El header y el footer son un parcial único (partials/), pero los DATOS que
   van dentro (nombre del negocio, teléfono, año) llegan de la API. Esto los
   pinta igual en todas las páginas; antes cada una tenía su propia copia y ya
   habían empezado a divergir. Requiere `BL.load()` hecho. */
function blPintarNegocio() {
  const { businessName, whatsappPhone } = BL.info;
  document.querySelectorAll('[data-bl="brand"]').forEach((el) => {
    el.childNodes[0].nodeValue = businessName;
  });
  document.querySelectorAll('[data-bl="brand-plain"]').forEach((el) => {
    el.textContent = businessName;
  });
  document.querySelectorAll('[data-bl="year"]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
  document.querySelectorAll('.brand-mark').forEach((el) => {
    el.textContent = businessName.trim().charAt(0).toUpperCase();
  });

  // "Cotizar a medida": el modal lo intercepta, pero el href queda armado como
  // respaldo por si el JS del modal no llegó a montarse.
  const tel = blTelefono(whatsappPhone);
  const msg = encodeURIComponent(`Hola ${businessName}, quiero cotizar un trabajo.`);
  document.querySelectorAll('[data-bl="cotizar"]').forEach((a) => {
    if (!tel) { a.hidden = true; return; }
    a.href = `https://wa.me/${tel}?text=${msg}`;
    a.target = '_blank';
    a.rel = 'noopener';
  });
}

/** Teléfono a formato internacional: sin separadores, 0 inicial -> 58. */
function blTelefono(crudo) {
  const digitos = (crudo ?? '').replace(/\D/g, '');
  return digitos.startsWith('0') ? `58${digitos.slice(1)}` : digitos;
}

/**
 * Marca el enlace del menú que corresponde a la página actual. Compara por
 * prefijo para que `/producto/x` marque "Tienda" y `/tienda/?cat=y` también.
 */
function blMarcarNav() {
  const ruta = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const destino = new URL(a.href, location.origin).pathname.replace(/\/+$/, '') || '/';
    const activo = destino === '/' ? ruta === '/' : ruta === destino || ruta.startsWith(destino + '/');
    // La ficha de producto cuelga de /producto/, no de /tienda/: se marca a mano.
    const esFicha = ruta.startsWith('/producto') && destino === '/tienda';
    if (activo || esFicha) a.classList.add('active');
  });
}

/**
 * Tarjeta de producto. La usan la vitrina, los relacionados de la ficha y los
 * destacados del inicio: tres copias divergentes de esto era cuestión de tiempo.
 */
function blTarjetaProducto(p) {
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
        <span class="price">${formatPrice(p.price)}${tachado}</span>
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

/** Engancha los botones "Agregar"/"Elegir" de un contenedor de tarjetas. */
function blEngancharTarjetas(contenedor) {
  contenedor.querySelectorAll('[data-add]').forEach((b) => {
    b.addEventListener('click', () => {
      const p = BL.find(b.dataset.add);
      // Si hay que elegir algo (un color, un tamaño), agregarlo desde acá
      // cotizaría el precio base y sin la opción: mejor llevarlo a la ficha.
      if (p?.requiresOptions) { location.href = `/producto/${p.id}`; return; }
      Cart.add(b.dataset.add);
    });
  });
}

/* ---------- Puente a global ----------
   El archivo es un módulo (lo procesa Vite por `import.meta.env`), así que sus
   símbolos NO son globales. El HTML usa `onclick="Cart.open()"` y la vitrina lee
   `BL`, así que se exponen a mano. Sin esto, los botones del HTML no encuentran
   nada y fallan en silencio. */
window.BL = BL;
window.Cart = Cart;
window.formatPrice = formatPrice;
window.fetchProduct = fetchProduct;
window.blToggleNav = blToggleNav;
window.esc = escapeHtml;
window.Checkout = Checkout;
window.Custom = Custom;
window.blPintarNegocio = blPintarNegocio;
window.blTarjetaProducto = blTarjetaProducto;
window.blEngancharTarjetas = blEngancharTarjetas;
window.blTelefono = blTelefono;

/* ---------- Arranque ---------- */
window.addEventListener('DOMContentLoaded', () => {
  blInjectCart();
  blInjectCustomModal();
  blInitReveal();
  document.getElementById('checkoutForm')?.addEventListener('submit', (e) => Checkout.enviarPedido(e));
  // Delegado y en captura: los enlaces "Cotizar a medida" se pintan DESPUÉS
  // (cuando llega la info del negocio), así que engancharlos uno por uno acá
  // llegaría tarde. Si el modal no existiera, el enlace a WhatsApp sigue vivo.
  document.addEventListener('click', (e) => {
    const disparador = e.target.closest?.('[data-bl="cotizar"]');
    if (!disparador || !document.getElementById('customModal')) return;
    e.preventDefault();
    Custom.open();
  });
  blMarcarNav();
});
window.addEventListener('storage', () => Cart.render());
