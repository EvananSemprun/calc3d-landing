/**
 * El título de la pestaña de una ficha resuelta EN VIVO.
 *
 * La tienda se arma en el build, así que un producto creado después no tiene página
 * propia: su enlace cae en la 404, que lo rescata contra la API. El producto se ve
 * entero, pero el `<title>` del HTML sigue siendo el del cartel de error. Esto lo
 * corrige desde el navegador, que es el único lado que sabe qué producto es.
 *
 * ⚠️ **Devuelve `null` cuando todavía no hay nada que afirmar** (la respuesta viaja, o
 * la API no contestó y solo está lo horneado). Ahí el título se deja como está: en una
 * ficha de verdad el horneado ya es el correcto, y pisarlo con un texto de relleno
 * sería cambiar un título equivocado por otro.
 *
 * ⚠️ **Lo que NO arregla, y es a propósito**: la ruta sigue respondiendo 404 y las
 * etiquetas `og:` del HTML siguen siendo las del cartel, así que una tarjeta de
 * WhatsApp y Google siguen viendo «Página no encontrada» hasta el próximo build. El
 * dueño lo eligió así el 2026-11-09 (ver CLAUDE.md, «El enlace de un producto que
 * todavía no tiene página»): no quiere reconstruir el sitio por cada carga.
 */
export function tituloDeFicha(
  producto: { name: string } | null,
  noExiste: boolean,
  negocio: string,
): string | null {
  // Igual que la ficha: el «no existe» pisa a lo horneado. Decir el nombre de algo que
  // ya no se vende es justo lo que no hay que hacer.
  if (noExiste) return `Producto no disponible — ${negocio}`;
  if (!producto) return null;
  return `${producto.name} — ${negocio}`;
}
