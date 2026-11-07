// Paginación del listado. Dos modos con el mismo aspecto:
//  - ESTÁTICO (sin filtros): enlaces reales a /pagina/<n>/. Es lo que lee un buscador y
//    lo que funciona sin JavaScript.
//  - CLIENTE (con un filtro activo): botones; la isla pagina sobre el índice.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rutaDePagina, ventanaDePaginas } from '@/lib/paginacion';

interface Props {
  actual: number;
  total: number;
  /** Ruta de la categoría: activa el modo de enlaces. */
  cat: string;
  sub: string | null;
  /** Presente = modo cliente (botones). */
  onIr?: (n: number) => void;
}

const BASE = 'h-10 min-w-10 px-3.5';
const SUAVE =
  'border-[var(--card-line-strong)] bg-transparent text-foreground shadow-none hover:border-primary hover:bg-transparent hover:text-primary dark:border-[var(--card-line-strong)] dark:bg-transparent dark:hover:bg-transparent';

export default function Paginacion({ actual, total, cat, sub, onIr }: Props) {
  if (total <= 1) return null;

  const boton = (n: number, contenido: React.ReactNode, etiqueta: string, deshabilitado = false, rel?: string) => {
    const esActual = n === actual && typeof contenido === 'number';
    const clases = `${BASE} ${esActual ? '' : SUAVE}`;
    const variante = esActual ? 'default' : 'outline';
    if (onIr) {
      return (
        <Button
          key={etiqueta}
          type="button"
          variant={variante}
          className={clases}
          disabled={deshabilitado}
          aria-label={etiqueta}
          aria-current={esActual ? 'page' : undefined}
          onClick={() => onIr(n)}
        >
          {contenido}
        </Button>
      );
    }
    if (deshabilitado) {
      return (
        <Button key={etiqueta} type="button" variant="outline" className={clases} disabled aria-label={etiqueta}>
          {contenido}
        </Button>
      );
    }
    return (
      <Button key={etiqueta} asChild variant={variante} className={clases}>
        <a href={rutaDePagina(cat, sub, n)} aria-label={etiqueta} aria-current={esActual ? 'page' : undefined} rel={rel}>
          {contenido}
        </a>
      </Button>
    );
  };

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Paginación">
      {boton(actual - 1, <ChevronLeft aria-hidden="true" />, 'Página anterior', actual <= 1, 'prev')}
      {ventanaDePaginas(actual, total).map((n, i) =>
        n === null ? (
          <span key={`hueco-${i}`} className="mono dim px-1" aria-hidden="true">
            …
          </span>
        ) : (
          boton(n, n, `Página ${n}`)
        ),
      )}
      {boton(actual + 1, <ChevronRight aria-hidden="true" />, 'Página siguiente', actual >= total, 'next')}
    </nav>
  );
}
