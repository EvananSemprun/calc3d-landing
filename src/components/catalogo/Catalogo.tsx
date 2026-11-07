// Isla del catálogo de UNA categoría: filtra, ordena y pinta. Recibe los productos de
// SU página (24, completos, ya renderizados en el HTML) y el ÍNDICE de la categoría
// entera (lo mínimo de cada producto). Dos modos:
//  - SIN filtros: manda el paginado estático (la página 2 es un archivo propio).
//  - CON un filtro activo: la isla filtra el ÍNDICE completo y pagina del lado del
//    cliente (`?p=`), porque un filtro sobre 24 productos mentiría sobre los otros 976.
//
// El dominio de los controles (tope de precio, colores) sale SIEMPRE de la categoría
// entera, nunca de la página: si no, el slider y los chips cambiarían de página en página.
//
// La URL refleja los filtros (?col&max&sort&p) y se restauran al cargar. Dos reglas que
// costaron bugs en el sitio viejo, no reintroducir:
//  1. NO sincronizar la URL antes de haber restaurado: con el estado aún vacío borraría
//     los parámetros antes de leerlos. (`listo` lo impide.)
//  2. Sincronizar SIEMPRE, también cuando no hay resultados: un filtro que no devuelve
//     nada igual tiene que quedar en el link. (No hay `return` temprano entre medio.)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InfoApi } from '@/lib/api';
import {
  filtrar,
  filtrosDesdeUrl,
  filtrosIniciales,
  hayFiltros,
  sincronizarUrl,
  topePrecio,
  valeLaPenaFiltrar,
  type ColorFiltro,
  type Filtros as EstadoFiltros,
} from '@/lib/catalogo';
import {
  conPagina,
  paginaDe,
  paginaDesdeUrl,
  totalDePaginas,
  type EntradaIndice,
} from '@/lib/paginacion';
import type { ProductoVitrina } from '@/lib/producto';
import Filtros from './Filtros';
import Paginacion from './Paginacion';
import TarjetaIndice from './TarjetaIndice';
import TarjetaProducto from './TarjetaProducto';

interface Props {
  /** Los productos de ESTA página (completos). */
  productos: ProductoVitrina[];
  /** Lo mínimo de TODOS los productos de la categoría. */
  indice: EntradaIndice[];
  /** Colores de la categoría entera como [nombre, hex] (el índice solo trae nombres). */
  colores: ColorFiltro[];
  info: InfoApi;
  cat: string;
  sub: string | null;
  pagina: number;
  paginas: number;
}

export default function Catalogo({ productos, indice, colores, info, cat, sub, pagina, paginas }: Props) {
  const tope = useMemo(() => topePrecio(indice), [indice]);
  const datos = useMemo(() => ({ colores, tope }), [colores, tope]);

  // El primer render (servidor Y cliente) usa los filtros por defecto: así el HTML
  // hidrata sin discrepancias. La URL se aplica justo después, en el efecto.
  const [filtros, setFiltros] = useState<EstadoFiltros>(() => filtrosIniciales(tope));
  const [pag, setPag] = useState(1);
  const [listo, setListo] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  // Sobre el índice de TODA la categoría, nunca sobre `productos` (la página de 24).
  const conFiltros = valeLaPenaFiltrar(indice);

  const activo = hayFiltros(filtros, tope);

  // Restaurar desde la URL (vista compartible). Un valor que ya no existe se ignora.
  // Sin panel no hay con qué limpiar: un enlace viejo con `?col&max` NO se aplica (la URL
  // se limpia sola en el efecto de abajo). Igual se marca `listo`, o la URL nunca se sincroniza.
  useEffect(() => {
    const restaurados = conFiltros ? filtrosDesdeUrl(window.location.search, datos) : filtrosIniciales(datos.tope);
    setFiltros(restaurados);
    setPag(hayFiltros(restaurados, datos.tope) ? paginaDesdeUrl(window.location.search) : 1);
    setListo(true);
  }, [datos, conFiltros]);

  const filtrados = useMemo(() => (activo ? filtrar(indice, filtros) : []), [activo, indice, filtros]);
  const totalFiltrado = totalDePaginas(filtrados.length);
  // Si la página guardada en el enlace ya no existe (el catálogo cambió), se acota.
  const pagCliente = Math.min(pag, totalFiltrado);

  // La URL refleja SIEMPRE lo que se ve. Solo después de restaurar (regla 1).
  useEffect(() => {
    if (!listo) return;
    const nueva = conPagina(sincronizarUrl(window.location.href, filtros, tope), activo ? pagCliente : 1);
    if (nueva !== window.location.href) window.history.replaceState(null, '', nueva);
  }, [filtros, listo, tope, activo, pagCliente]);

  const cambiar = useCallback(
    (cambio: Partial<EstadoFiltros> | ((actual: EstadoFiltros) => Partial<EstadoFiltros>)) => {
      setFiltros((f) => ({ ...f, ...(typeof cambio === 'function' ? cambio(f) : cambio) }));
      setPag(1); // otro filtro, otro resultado: se vuelve a la primera
    },
    [],
  );
  const limpiar = useCallback(() => {
    setFiltros(filtrosIniciales(tope));
    setPag(1);
  }, [tope]);
  const irAPagina = useCallback((n: number) => {
    setPag(n);
    document.getElementById('shopGrid')?.scrollIntoView({ block: 'start' });
  }, []);

  const total = activo ? filtrados.length : indice.length;
  const visiblesCliente = activo ? paginaDe(filtrados, pagCliente) : [];

  return (
    // `grid-cols-1` anula la columna de 250px de `.shop-layout`: esa clase vive en
    // `@layer components` y las utilidades de Tailwind le ganan por orden de capas.
    <div className={`container shop-layout${conFiltros ? '' : ' grid-cols-1'}`}>
      {conFiltros && (
        <aside className={`filters${panelAbierto ? ' open' : ''}`} id="filters" aria-label="Filtros del catálogo">
          <Filtros
            filtros={filtros}
            colores={colores}
            tope={tope}
            onCambio={cambiar}
            onLimpiar={limpiar}
            onCerrar={() => setPanelAbierto(false)}
          />
        </aside>
      )}

      <div className="shop-main">
        <div className="shop-toolbar">
          {conFiltros && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="filters-toggle h-10 border-[var(--card-line-strong)] bg-transparent px-[18px] shadow-none dark:bg-transparent"
              aria-expanded={panelAbierto}
              aria-controls="filters"
              onClick={() => setPanelAbierto((a) => !a)}
            >
              <SlidersHorizontal aria-hidden="true" /> Filtros
            </Button>
          )}
          <span className="result-count mono dim" role="status" aria-live="polite">
            {total} producto{total === 1 ? '' : 's'}
          </span>
        </div>

        {!activo ? (
          <>
            <div className="grid shop-grid" id="shopGrid">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} tasa={info.rate} />
              ))}
            </div>
            <Paginacion actual={pagina} total={paginas} cat={cat} sub={sub} />
          </>
        ) : filtrados.length > 0 ? (
          <>
            <div className="grid shop-grid" id="shopGrid">
              {visiblesCliente.map((e) => (
                <TarjetaIndice key={e.id} entrada={e} tasa={info.rate} />
              ))}
            </div>
            <Paginacion actual={pagCliente} total={totalFiltrado} cat={cat} sub={sub} onIr={irAPagina} />
          </>
        ) : (
          <div className="shop-state" id="shopGrid">
            <strong>No hay productos con esos filtros.</strong>
            <Button type="button" className="mt-3.5 h-10 px-[18px]" onClick={limpiar}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
