import { fetchCategorias, fetchProductosCompletos } from '@/lib/api';
import { categoriasDelIndice, listadosDe, raicesConProductos, rutaDeCategoria } from '@/lib/paginacion';
import { useEnVivo } from '@/lib/vivo';

interface Entrada {
  slug: string;
  nombre: string;
  n: number;
  /** Nombres de las subcategorías, solo en el índice de /tienda/. */
  hijas?: string[];
}

/**
 * La lista de categorías, EN VIVO sobre lo horneado.
 *
 * La usan la portada (`modo="raices"`) y el índice de /tienda/ (`modo="indice"`). Es UNA
 * sola definición con dos variantes de marcado, en vez de dos componentes casi iguales:
 * el día que cambie la tarjeta de categoría se cambia acá y vale para los dos lugares.
 *
 * ⚠️ La diferencia entre los dos modos NO es cosmética: el índice incluye «Sin
 * categoría» y la portada no. Eso lo deciden `categoriasDelIndice` y
 * `raicesConProductos`, las mismas funciones del build.
 *
 * ⚠️ Una categoría aparece cuando gana su primer producto y se va cuando pierde el
 * último, sin reconstruir. Si la API falla, se conserva lo horneado.
 */
export default function CategoriasEnVivo({
  inicial,
  modo,
  titulo,
  verTodo = false,
}: {
  inicial: Entrada[];
  modo: 'raices' | 'indice';
  titulo: string;
  verTodo?: boolean;
}) {
  const { datos } = useEnVivo(inicial, async () => {
    const [productos, categorias] = await Promise.all([fetchProductosCompletos(), fetchCategorias()]);
    const base = modo === 'indice' ? categoriasDelIndice(categorias, productos) : raicesConProductos(categorias, productos);
    if (modo !== 'indice') return base;
    const listados = listadosDe(categorias, productos);
    return base.map((c) => ({
      ...c,
      hijas: (listados.find((l) => l.cat === c.slug && l.sub === null)?.hijas ?? []).map((h) => h.nombre),
    }));
  });

  if (datos.length === 0) return null;

  return (
    <section className="section" aria-labelledby="categorias-titulo">
      <div className="container">
        {verTodo ? (
          <div className="eyebrow-row mb-6">
            <h2 className="h2" id="categorias-titulo">
              {titulo}
            </h2>
            <a href="/tienda/" className="text-sm font-semibold text-primary hover:underline">
              Ver todo el catálogo →
            </a>
          </div>
        ) : (
          <h2 className="h2 mb-6" id="categorias-titulo">
            {titulo}
          </h2>
        )}
        <ul className="grid shop-grid entrada-grid list-none p-0 m-0">
          {datos.map((c) => (
            <li key={c.slug}>
              <a className="card block p-6 hover:border-primary" href={rutaDeCategoria(c.slug)}>
                <h3 className="text-lg font-semibold">{c.nombre}</h3>
                <p className="mono dim mt-1 text-sm">
                  {c.n} producto{c.n === 1 ? '' : 's'}
                </p>
                {c.hijas && c.hijas.length > 0 && (
                  <p className="dim mt-2 text-sm">{c.hijas.join(' · ')}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
