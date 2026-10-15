// Escapado de texto para armar HTML con plantillas. Los nombres y descripciones
// los escribe el dueño en el panel, pero igual se escapan: un `<` suelto rompería
// la vitrina. Pura: sin DOM, sirve en el build (Node) y en el navegador.

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] as string);
}

/** Para valores de atributo: el escapado es el mismo (incluye ambas comillas). */
export function escapeAttr(s: unknown): string {
  return escapeHtml(s);
}
