/**
 * AL ELEGIR OTRA MINIATURA, LA FOTO PRINCIPAL CRUZA (2026-11-09).
 *
 * Elegir otra miniatura cambiaba el `src` de `.pdp-main` y la foto nueva aparecía de
 * golpe. Ahora la marca el cruce de la Tarea 5 (`useCruce`, `components/ui/Cruce.tsx`) y
 * entra fundida en `--dur-normal`.
 *
 * **El porqué de todo esto —`useCruce` y no el fundido de `data-fundir`, `prioridad`
 * intacta, cruzar sin esperar el `load`— vive en la cabecera de `Galeria.tsx`, y vive
 * ahí SOLO.** Lo que sigue es lo que le toca a un archivo de tests.
 *
 * ⚠️ **Acá se amarra la ESTRUCTURA, no la geometría.** jsdom no aplica CSS y no hace
 * layout, así que un test de este archivo que midiera «la foto no cambia de alto entre
 * fotos de distinta proporción» daría **verde con el CSS roto**. El alto lo garantiza el
 * `aspect-ratio` de `.pdp-main` y ya lo vigila `src/fotos-reservan-espacio.spec.ts`; el
 * CSS del cruce, `src/cruce-funde.spec.ts`. Lo único que hace falta acá es que la clase
 * siga puesta pase lo que pase.
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Galeria from './Galeria';
import type { FotoApi } from '@/lib/producto';

/** Tres fotos con URL distinta: el cruce compara la URL, que es lo que de verdad cambia. */
const FOTOS: FotoApi[] = [
  { url: 'https://fotos.example/arbol-verde.png', alt: 'Árbol verde' },
  { url: 'https://fotos.example/arbol-rojo.png', alt: 'Árbol rojo' },
  { url: 'https://fotos.example/arbol-dorado.png', alt: 'Árbol dorado' },
];

/**
 * `Galeria` es controlada (`activa` + `onElegir`): sin alguien que guarde la elección, un
 * clic no cambiaría nada y el test no podría ver el cruce. Esto es el `Ficha` mínimo.
 */
function GaleriaConEstado({ fotos = FOTOS }: { fotos?: FotoApi[] }) {
  const [activa, setActiva] = useState(0);
  return <Galeria fotos={fotos} activa={activa} onElegir={setActiva} nombre="Árbol de Navidad" />;
}

const principal = (): HTMLImageElement => {
  const img = document.querySelector<HTMLImageElement>('img.pdp-main');
  if (!img) throw new Error('No hay foto principal (`img.pdp-main`) en la galería');
  return img;
};

/**
 * Elegir la miniatura N (1-based, como la dice su `aria-label`).
 *
 * ⚠️ Va con `fireEvent` y no con `el.click()`: un `.click()` pelado dispara el evento
 * pero deja la actualización de estado de React sin vaciar, así que el `src` de la foto
 * principal se queda en la de antes y el test falla por el motivo equivocado (medido).
 */
const elegir = (n: number) =>
  fireEvent.click(screen.getByRole('button', { name: `Ver foto ${n}` }));

describe('Galeria — la foto principal cruza al cambiar', () => {
  it('al elegir otra miniatura, la foto principal cruza', () => {
    render(<GaleriaConEstado />);

    // En el primer render NO cruza: lo horneado ya viene pintado en el HTML del build y
    // fundirlo al montar haría parpadear la ficha en cada carga sin que nada cambiara.
    expect(
      principal().getAttribute('data-cruce'),
      'La foto cruzó en el primer render: eso es un parpadeo en cada carga de la ficha.',
    ).toBeNull();

    elegir(2);

    expect(principal().getAttribute('src')).toBe(FOTOS[1].url);
    expect(
      principal().getAttribute('data-cruce'),
      'La foto principal cambió sin la marca del cruce: entra de golpe.',
    ).not.toBeNull();
  });

  it('la foto principal conserva la clase `.pdp-main` sea cual sea la elegida', () => {
    render(<GaleriaConEstado />);

    // El `aspect-ratio` que evita el salto de alto vive en `.pdp-main`. Si el cruce
    // hubiera llegado envolviendo la foto o pisando su `className`, la clase se perdería
    // y el salto volvería sin que nada fallara.
    for (const n of [2, 3, 1]) {
      elegir(n);
      expect(
        principal().className.split(/\s+/),
        `Al elegir la foto ${n}, la principal perdió la clase \`pdp-main\``,
      ).toContain('pdp-main');
      expect(principal().getAttribute('src')).toBe(FOTOS[n - 1].url);
    }
  });

  it('al elegir la MISMA miniatura no cruza', () => {
    // ⚠️ Éste es el que evita el verde vacío: si el mecanismo marcara en CADA render, los
    // dos tests de arriba pasarían igual y la ficha parpadearía con cada clic inútil.
    render(<GaleriaConEstado />);

    elegir(1);
    expect(
      principal().getAttribute('data-cruce'),
      'La miniatura ya elegida no cambia la foto: no hay nada que cruzar.',
    ).toBeNull();

    elegir(2);
    const marca = principal().getAttribute('data-cruce');
    expect(marca).not.toBeNull();

    // Volver a tocar la que ya está activa no estrena turno. (`useCruce` alterna entre
    // `1` y `2` para que una animación de CSS se reinicie; si marcara de nuevo acá, la
    // marca cambiaría de valor y la foto volvería a fundirse sin haber cambiado.)
    elegir(2);
    expect(
      principal().getAttribute('data-cruce'),
      'Tocar dos veces la misma miniatura volvió a disparar el cruce.',
    ).toBe(marca);
  });

  it('la foto principal sigue SIN fundido: el cruce no se cuela por la puerta de atrás', () => {
    render(<GaleriaConEstado />);

    // `data-fundir` es lo que `<Foto>` deja de poner cuando lleva `prioridad`. Quitárselo
    // a `.pdp-main` para «fundirla también al cargar» retrasa el LCP de la ficha (medido:
    // 11,4 s con la red frenada en escritorio), que es causa de reversión declarada en el
    // plan. Cruzar al CAMBIAR de foto es gratis; fundir su CARGA INICIAL no lo es.
    //
    // ⚠️ `dist-sin-js.spec.ts` ya lo vigila, pero sobre el `dist/` construido, y ése NO lo
    // corre `pnpm test` (necesita un build que le pega a la API). Acá cuesta un render.
    expect(
      principal().hasAttribute('data-fundir'),
      'A `.pdp-main` le quitaron `prioridad`: vuelve a fundirse al cargar y con eso se ' +
        'va el LCP de la ficha.',
    ).toBe(false);
  });

  it('sin fotos no hay foto principal que cruzar, y no revienta', () => {
    // `useCruce` no marca cuando falta el dato de alguno de los dos lados, así que pasar
    // de «sin foto» a «con foto» entra seco: es un cambio de ALTO, no de valor.
    const { container } = render(<GaleriaConEstado fotos={[]} />);
    expect(container.querySelector('img.pdp-main')).toBeNull();
    expect(container.querySelector('.ph.pdp-main')).not.toBeNull();
  });
});
