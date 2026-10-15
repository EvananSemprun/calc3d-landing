// Barra lateral de filtros. TODOS los filtros van de un solo lado (decisión del dueño):
// Categoría (select, selección única), Material y Color (multi-selección), Precio
// máximo (slider) y Orden (select). La barra superior solo trae el botón "Filtros" del
// móvil y el conteo. Es controlada: el estado vive en <Catalogo>.
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type {
  CategoriaConConteo,
  ColorFiltro,
  Filtros as EstadoFiltros,
  MaterialFiltro,
  Orden,
} from '@/lib/catalogo';

/** Radix no admite value="" en un item (está reservado para limpiar): "Todos" usa este. */
const TODOS = 'todos';

const ORDENES: { value: Orden; label: string }[] = [
  { value: 'featured', label: 'Destacados' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre A-Z' },
];

interface Props {
  filtros: EstadoFiltros;
  totalProductos: number;
  categorias: CategoriaConConteo[];
  materiales: MaterialFiltro[];
  colores: ColorFiltro[];
  tope: number;
  /** Acepta una función para derivar el cambio del estado MÁS RECIENTE (evita cierres viejos). */
  onCambio: (cambio: Partial<EstadoFiltros> | ((actual: EstadoFiltros) => Partial<EstadoFiltros>)) => void;
  onLimpiar: () => void;
  onCerrar: () => void;
}

/** Agrega o quita `valor` del arreglo (inmutable: React compara por referencia). */
function alternar(lista: string[], valor: string): string[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

// El select de la marca: caja oscura redondeada, lista navy con el elegido en amarillo.
const DISPARADOR =
  'h-11 w-full rounded-xl border-border bg-ink-900/60 px-3.5 data-[size=default]:h-11 dark:bg-ink-900/60';
// z-index por encima del panel móvil (z-150): si no, la lista abre DETRÁS del panel.
const LISTA = 'z-[200] rounded-xl border-border bg-ink-700';
const ITEM = 'rounded-lg focus:bg-ink-600 data-[state=checked]:font-semibold data-[state=checked]:text-primary';

export default function Filtros({
  filtros,
  totalProductos,
  categorias,
  materiales,
  colores,
  tope,
  onCambio,
  onLimpiar,
  onCerrar,
}: Props) {
  const categoriaElegida = categorias.find((c) => c.slug === filtros.cat);
  const etiquetaCategoria = categoriaElegida
    ? `${categoriaElegida.nombre} (${categoriaElegida.n})`
    : `Todos (${totalProductos})`;
  const etiquetaOrden = ORDENES.find((o) => o.value === filtros.sort)?.label ?? 'Destacados';

  return (
    <>
      <div className="filters-head">
        <strong>Filtros</strong>
        <span className="flex items-center gap-1">
          <button type="button" className="filters-clear" onClick={onLimpiar}>
            Limpiar
          </button>
          <button type="button" className="filters-close" onClick={onCerrar} aria-label="Cerrar filtros">
            <X aria-hidden="true" size={18} />
          </button>
        </span>
      </div>

      {/* Con menos de 2 categorías no hay elección que ofrecer: se oculta el grupo
          entero (con su título). */}
      {categorias.length >= 2 && (
        <div className="filter-group">
          <h4 id="filtro-categoria">Categoría</h4>
          <Select value={filtros.cat || TODOS} onValueChange={(v) => onCambio({ cat: v === TODOS ? '' : v })}>
            <SelectTrigger className={DISPARADOR} aria-labelledby="filtro-categoria">
              <SelectValue>{etiquetaCategoria}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className={LISTA}>
              <SelectItem value={TODOS} className={ITEM}>
                Todos ({totalProductos})
              </SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.slug} value={c.slug} className={ITEM}>
                  {c.nombre} ({c.n})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {materiales.length > 0 && (
        <div className="filter-group">
          <h4>Material</h4>
          <div className="chip-row">
            {materiales.map((m) => (
              <button
                key={m.key}
                type="button"
                className="chip"
                aria-pressed={filtros.materials.includes(m.key)}
                onClick={() => onCambio((f) => ({ materials: alternar(f.materials, m.key) }))}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Los colores salen de los productos reales. Sin colores, el grupo se oculta. */}
      {colores.length > 0 && (
        <div className="filter-group">
          <h4>Color</h4>
          <div className="color-row">
            {colores.map(([valor, hex]) => (
              <button
                key={valor}
                type="button"
                className="color-pick"
                style={{ ['--c' as string]: hex }}
                aria-label={valor}
                aria-pressed={filtros.colors.includes(valor)}
                title={valor}
                onClick={() => onCambio((f) => ({ colors: alternar(f.colors, valor) }))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <h4>Precio máximo</h4>
        <Slider
          aria-label="Precio máximo"
          min={0}
          max={tope}
          step={1}
          value={[filtros.maxPrice]}
          onValueChange={([v]) => onCambio({ maxPrice: v ?? tope })}
        />
        <div className="range-val mono">
          Hasta <span>${filtros.maxPrice}</span> USD
        </div>
      </div>

      <div className="filter-group">
        <h4 id="filtro-orden">Ordenar</h4>
        <Select value={filtros.sort} onValueChange={(v) => onCambio({ sort: v as Orden })}>
          <SelectTrigger className={DISPARADOR} aria-labelledby="filtro-orden">
            <SelectValue>{etiquetaOrden}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className={LISTA}>
            {ORDENES.map((o) => (
              <SelectItem key={o.value} value={o.value} className={ITEM}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
