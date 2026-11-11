// Setup del proyecto `dom` de vitest (ver `vitest.config.ts`).
//
// `@testing-library/jest-dom` agrega los matchers de DOM (`toBeInTheDocument`,
// `toHaveAttribute`...). `cleanup` desmonta lo renderizado entre tests: sin eso, dos
// tests que rendericen el mismo componente dejan DOS copias en el documento y un
// `getByRole` falla por ambigüedad — un rojo que no habla de lo que se está probando.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// ⚠️ **`ResizeObserver` no existe en jsdom**, y el carrusel lo usa para saber cuándo
// volver a mirar si llegó a un extremo. Sin este doble, montarlo lanza
// `ReferenceError` y los 8 tests mueren antes de afirmar nada.
//
// Va acá y NO como una guarda en el componente: un `typeof ResizeObserver !== 'undefined'`
// sería código muerto en todo navegador real, y este repo ya tiene escrito que una guarda
// que nadie puede tumbar es peor que no tenerla. Lo que falta es del ENTORNO de prueba.
//
// El doble no observa nada a propósito: jsdom no hace layout, así que un cambio de tamaño
// no existe. Lo que los tests inyectan son las medidas, no los eventos.
// ⚠️ **`matchMedia` tampoco existe en jsdom**, y el carrusel lo consulta para decidir si
// el desplazamiento va suave o seco (`prefers-reduced-motion`). El doble responde que NO
// hay preferencia de movimiento reducido, que es el caso por defecto de un navegador.
//
// ⚠️ Si algún día hace falta probar el camino de `reduce`, **no se cambia este default**:
// se sobreescribe `window.matchMedia` en ese test. Cambiarlo acá movería en silencio el
// supuesto de todos los demás.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
