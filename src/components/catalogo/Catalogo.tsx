// Isla del catálogo: filtra, ordena y pinta. Los datos llegan como props, traídos en
// el BUILD por tienda/index.astro; Astro renderiza esta isla en el servidor (el HTML
// del catálogo completo queda en la página, para el buscador) y la hidrata en el
// navegador para filtrar. Es el porte de `Shop` en tienda/index.html del sitio viejo.
//
// La URL refleja los filtros (?cat&mat&col&max&sort) y se restauran al cargar. Dos
// reglas que costaron bugs en el sitio viejo, no reintroducir:
//  1. NO sincronizar la URL antes de haber restaurado: con el estado aún vacío borraría
//     los parámetros antes de leerlos. (`listo` lo impide.)
//  2. Sincronizar SIEMPRE, también cuando no hay resultados: un filtro que no devuelve
//     nada igual tiene que quedar en el link. (No hay `return` temprano entre medio.)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InfoApi } from '@/lib/api';
import {
  categoriasConProductos,
  coloresDe,
  filtrar,
  filtrosDesdeUrl,
  filtrosIniciales,
  hayFiltros,
  materialesDe,
  sincronizarUrl,
  topePrecio,
  type Categoria,
  type Filtros as EstadoFiltros,
} from '@/lib/catalogo';
import type { ProductoVitrina } from '@/lib/producto';
import Filtros from './Filtros';
import TarjetaProducto from './TarjetaProducto';

interface Props {
  productos: ProductoVitrina[];
  info: InfoApi;
  /** Todas las categorías del negocio, en su orden; acá se quedan las que tienen productos. */
  categorias: Categoria[];
}

export default function Catalogo({ productos, info, categorias }: Props) {
  const datos = useMemo(
    () => ({
      cats: categoriasConProductos(categorias, productos),
      materiales: materialesDe(productos),
      colores: coloresDe(productos),
      tope: topePrecio(productos),
    }),
    [categorias, productos],
  );

  // El primer render (servidor Y cliente) usa los filtros por defecto: así el HTML
  // hidrata sin discrepancias. La URL se aplica justo después, en el efecto.
  const [filtros, setFiltros] = useState<EstadoFiltros>(() => filtrosIniciales(datos.tope));
  const [listo, setListo] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  // Restaurar desde la URL (vista compartible). Un valor que ya no existe se ignora.
  useEffect(() => {
    setFiltros(filtrosDesdeUrl(window.location.search, datos));
    setListo(true);
  }, [datos]);

  // La URL refleja SIEMPRE lo que se ve. Solo después de restaurar (regla 1).
  useEffect(() => {
    if (!listo) return;
    const nueva = sincronizarUrl(window.location.href, filtros, datos.tope);
    if (nueva !== window.location.href) window.history.replaceState(null, '', nueva);
  }, [filtros, listo, datos.tope]);

  const cambiar = useCallback(
    (cambio: Partial<EstadoFiltros> | ((actual: EstadoFiltros) => Partial<EstadoFiltros>)) => {
      setFiltros((f) => ({ ...f, ...(typeof cambio === 'function' ? cambio(f) : cambio) }));
    },
    [],
  );
  const limpiar = useCallback(() => setFiltros(filtrosIniciales(datos.tope)), [datos.tope]);

  const visibles = useMemo(() => filtrar(productos, filtros), [productos, filtros]);

  return (
    <div className="container shop-layout">
      <aside className={`filters${panelAbierto ? ' open' : ''}`} id="filters" aria-label="Filtros del catálogo">
        <Filtros
          filtros={filtros}
          totalProductos={productos.length}
          categorias={datos.cats}
          materiales={datos.materiales}
          colores={datos.colores}
          tope={datos.tope}
          onCambio={cambiar}
          onLimpiar={limpiar}
          onCerrar={() => setPanelAbierto(false)}
        />
      </aside>

      <div className="shop-main">
        <div className="shop-toolbar">
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
          <span className="result-count mono dim" role="status" aria-live="polite">
            {visibles.length} producto{visibles.length === 1 ? '' : 's'}
          </span>
        </div>

        {visibles.length > 0 ? (
          <div className="grid shop-grid" id="shopGrid">
            {visibles.map((p) => (
              <TarjetaProducto key={p.id} producto={p} tasa={info.rate} />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="shop-state">
            <strong>Todavía no hay productos publicados.</strong>
            <p className="dim">Estamos preparando el catálogo. Mientras tanto, escribinos y cotizamos tu pieza.</p>
          </div>
        ) : (
          <div className="shop-state">
            <strong>No hay productos con esos filtros.</strong>
            {hayFiltros(filtros, datos.tope) && (
              <Button type="button" className="mt-3.5 h-10 px-[18px]" onClick={limpiar}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
