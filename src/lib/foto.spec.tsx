/**
 * La política de carga de una foto: cuándo se la marca como «todavía no cargada» y,
 * sobre todo, CUÁNDO SE LA DESMARCA.
 *
 * ⚠️ **El modo de falla de esto es dejar una foto invisible**, y es un fallo silencioso:
 * no hay error en consola, el build sale verde y los tipos compilan. El visitante ve un
 * hueco. Por eso lo que se fija acá no es que la marca se ponga —eso es lo fácil— sino
 * que haya **tres** caminos de salida y que ninguno dependa de que la red se porte bien:
 * el `load`, el techo por tiempo y la función que se devuelve.
 *
 * ⚠️ **El techo por tiempo es lo que cierra el agujero.** Con `prefers-reduced-motion`
 * la guardia de `global.css` baja la duración de la transición a `0.01ms`, pero **no
 * cambia el valor inicial**: sin el techo, una foto cuyo `onLoad` nunca llega (red
 * cortada a mitad de la descarga) queda transparente **para siempre**. El techo convierte
 * «invisible» en «aparece de golpe», que es el peor caso aceptable.
 *
 * ⚠️ **El archivo es `.tsx` aunque no haya JSX, y no es un detalle:** la extensión elige
 * el entorno de vitest (`.spec.ts` → `node`, `.spec.tsx` → `jsdom`). Esto manipula un
 * `HTMLImageElement`, que en `node` no existe: fallaría con «HTMLImageElement is not
 * defined». Mismo motivo por el que `lib/vivo.spec.tsx` es `.tsx` aunque pruebe un hook.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TECHO_CARGA_MS, marcarCargando } from './foto';

afterEach(() => {
  vi.useRealTimers();
});

/** Una `<img>` que, como en el navegador, todavía no terminó de bajar. */
function imagenEnVuelo(): HTMLImageElement {
  const img = document.createElement('img');
  // jsdom no baja imágenes, así que `complete` ya es `false`; se fija explícito para que
  // el test diga lo que supone y no dependa del humor de jsdom.
  Object.defineProperty(img, 'complete', { value: false, configurable: true });
  return img;
}

/** Una `<img>` servida desde la caché: su `load` YA pasó y no va a volver a disparar. */
function imagenEnCache(): HTMLImageElement {
  const img = document.createElement('img');
  Object.defineProperty(img, 'complete', { value: true, configurable: true });
  return img;
}

const marcada = (img: HTMLImageElement) => img.hasAttribute('data-cargando');

describe('la marca de «foto no cargada»', () => {
  it('no se aplica si la imagen ya está completa (foto en caché, el onLoad no llega nunca)', () => {
    const img = imagenEnCache();
    const liberar = marcarCargando(img);
    expect(marcada(img)).toBe(false);
    // Y lo que devuelve tiene que ser llamable igual, o el que la use necesitaría un `if`.
    expect(() => liberar()).not.toThrow();
  });

  it('se libera sola al pasar TECHO_CARGA_MS, aunque el onLoad nunca dispare', () => {
    vi.useFakeTimers();
    const img = imagenEnVuelo();
    marcarCargando(img);
    expect(marcada(img)).toBe(true);

    // Un milisegundo antes del techo sigue marcada: si no, el techo no sería el techo.
    vi.advanceTimersByTime(TECHO_CARGA_MS - 1);
    expect(marcada(img)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(marcada(img)).toBe(false);
  });

  it('el `load` de la imagen la libera, sin esperar el techo', () => {
    vi.useFakeTimers();
    const img = imagenEnVuelo();
    marcarCargando(img);
    img.dispatchEvent(new Event('load'));
    expect(marcada(img)).toBe(false);
  });

  it('el `error` también la libera: una foto que no bajó no puede dejar un hueco', () => {
    vi.useFakeTimers();
    const img = imagenEnVuelo();
    marcarCargando(img);
    img.dispatchEvent(new Event('error'));
    expect(marcada(img)).toBe(false);
  });

  it('la función que devuelve libera la marca al llamarla', () => {
    const img = imagenEnVuelo();
    const liberar = marcarCargando(img);
    expect(marcada(img)).toBe(true);
    liberar();
    expect(marcada(img)).toBe(false);
  });

  it('liberar dos veces no explota', () => {
    const img = imagenEnVuelo();
    const liberar = marcarCargando(img);
    liberar();
    expect(() => liberar()).not.toThrow();
    expect(marcada(img)).toBe(false);
  });

  it('el techo se mide con el reloj que se le pasa', () => {
    vi.useFakeTimers();
    const img = imagenEnVuelo();
    // Un reloj propio que ya está 1 s dentro del techo: lo que queda por esperar es el
    // resto, no otros TECHO_CARGA_MS completos.
    let t = 0;
    const ahora = () => {
      const v = t;
      t += 1000;
      return v;
    };
    marcarCargando(img, ahora);
    vi.advanceTimersByTime(TECHO_CARGA_MS - 1000);
    expect(marcada(img)).toBe(false);
  });
});
