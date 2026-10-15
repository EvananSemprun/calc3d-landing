// Subida de la foto de personalización a R2, en dos pasos (igual que el sitio viejo):
// 1) se le pide a la API una URL firmada (`/public/store/uploads/custom-url`);
// 2) se sube el archivo con un PUT directo a esa URL (sin credenciales nuestras).
// Devuelve la CLAVE del objeto, que es lo único que viaja en el pedido. Es una
// ESCRITURA: solo se usa desde el navegador, nunca en el build.

/** Tipos de imagen que acepta la subida (mismo set que el backend). */
export const CUSTOM_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/** Tope de tamaño de la foto (5 MB), igual que el backend. */
export const CUSTOM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const BASE = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

interface DestinoFirmado {
  url: string;
  headers?: Record<string, string>;
  key: string;
}

/** Valida tipo/tamaño; devuelve un mensaje para el usuario si no sirve, o null si sirve. */
export function motivoRechazoFoto(file: File): string | null {
  if (!(CUSTOM_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'La foto debe ser PNG, JPEG o WebP.';
  }
  if (file.size > CUSTOM_IMAGE_MAX_BYTES) return 'La foto no puede pesar más de 5 MB.';
  return null;
}

/**
 * Sube la foto y devuelve su clave en R2. Lanza con un mensaje para el usuario si
 * algo falla (la API no responde, el PUT firmado rechaza).
 */
export async function pedirUrlDeFoto(file: File): Promise<string> {
  const res = await fetch(`${BASE}/public/store/uploads/custom-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data as { message?: string | string[] } | null;
    const msg = Array.isArray(d?.message) ? d?.message[0] : d?.message;
    throw new Error(msg || `La API respondió ${res.status}`);
  }
  const destino = data as DestinoFirmado;
  // `fetch` a pelo: la URL firmada no lleva ni debe llevar nada nuestro.
  const put = await fetch(destino.url, { method: 'PUT', headers: destino.headers, body: file });
  if (!put.ok) throw new Error('No se pudo subir la foto. Probá de nuevo.');
  return destino.key;
}
