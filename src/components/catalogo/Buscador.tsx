// Buscador de la tienda. Capa fina sobre `lib/indice-busqueda` (donde está la lógica y
// los tests): pide el índice la primera vez que se enfoca el campo y filtra en el
// navegador. Si el JS falla, el campo simplemente no hace nada y el resto del sitio anda.
import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { buscar, type EntradaBusqueda } from '@/lib/indice-busqueda';

type Estado = 'sin-pedir' | 'cargando' | 'listo' | 'error';

export default function Buscador() {
  const [consulta, setConsulta] = useState('');
  const [indice, setIndice] = useState<EntradaBusqueda[]>([]);
  const [estado, setEstado] = useState<Estado>('sin-pedir');
  const [activo, setActivo] = useState(-1);
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idLista = useId();

  const pedirIndice = () => {
    if (estado !== 'sin-pedir' && estado !== 'error') return;
    setEstado('cargando');
    fetch('/indice-busqueda.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<EntradaBusqueda[]>;
      })
      .then((datos) => {
        setIndice(datos);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  };

  // Cierra al hacer clic afuera.
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const hayConsulta = consulta.trim().length > 0;
  const resultados = estado === 'listo' ? buscar(indice, consulta) : [];

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setAbierto(false);
    } else if (e.key === 'ArrowDown' && resultados.length) {
      e.preventDefault();
      setAbierto(true);
      setActivo((a) => (a + 1) % resultados.length);
    } else if (e.key === 'ArrowUp' && resultados.length) {
      e.preventDefault();
      setActivo((a) => (a <= 0 ? resultados.length - 1 : a - 1));
    } else if (e.key === 'Enter' && resultados.length) {
      e.preventDefault();
      window.location.href = `/producto/${resultados[Math.max(activo, 0)].id}/`;
    }
  };

  return (
    <div ref={raiz} className="relative mx-auto w-full max-w-2xl" role="search">
      <Input
        type="search"
        value={consulta}
        placeholder="¿Qué buscás? Ej.: soporte de celular, llavero…"
        aria-label="Buscar productos"
        role="combobox"
        aria-expanded={abierto && hayConsulta}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
        autoComplete="off"
        className="h-12 bg-card px-4 text-base"
        onFocus={() => {
          pedirIndice();
          setAbierto(true);
        }}
        onChange={(e) => {
          setConsulta(e.target.value);
          setActivo(-1);
          setAbierto(true);
        }}
        onKeyDown={alTeclear}
      />
      {abierto && hayConsulta && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Resultados de la búsqueda"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {estado === 'error' && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              No pudimos cargar la búsqueda. Probá desde el <a className="underline" href="/tienda/">catálogo</a>.
            </li>
          )}
          {estado === 'cargando' && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li>
          )}
          {estado === 'listo' && resultados.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              Nada con «{consulta.trim()}». Probá con otra palabra o <a className="underline" href="/tienda/">mirá el catálogo</a>.
            </li>
          )}
          {resultados.map((r, i) => (
            <li key={r.id} id={`${idLista}-${i}`} role="option" aria-selected={i === activo}>
              <a
                href={`/producto/${r.id}/`}
                className={`flex flex-col rounded-sm px-3 py-2 outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring ${i === activo ? 'bg-accent' : ''}`}
              >
                <span className="text-sm font-semibold">{r.name}</span>
                {r.catLabel && <span className="text-xs text-muted-foreground">{r.catLabel}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
