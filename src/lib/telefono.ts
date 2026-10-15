// Normalización de teléfono y armado del enlace de WhatsApp. Lo comparten el carrito,
// la pieza a medida y el CTA de "cotizar". Pura: sin DOM.

/**
 * Teléfono a formato internacional, sin separadores. El 0 inicial de Venezuela se
 * reemplaza por el código de país (58). Igual regla que el panel y el sitio viejo.
 */
export function telefonoInternacional(crudo: string | null | undefined): string {
  const digitos = (crudo ?? '').replace(/\D/g, '');
  return digitos.startsWith('0') ? `58${digitos.slice(1)}` : digitos;
}

/** Enlace wa.me con el teléfono normalizado y el mensaje codificado. */
export function urlWhatsapp(telCrudo: string | null | undefined, mensaje: string): string {
  return `https://wa.me/${telefonoInternacional(telCrudo)}?text=${encodeURIComponent(mensaje)}`;
}
