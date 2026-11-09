import { useEffect, useRef, useState } from 'react';
import { NoExiste } from './api';

/**
 * Datos EN VIVO sobre lo horneado.
 *
 * La tienda se arma en el build, así que lo que viene en el HTML es la foto del catálogo
 * del último despliegue. Esto le agrega la otra mitad: al montar, el navegador vuelve a
 * preguntarle a la API y reemplaza lo que haya cambiado. Prender o apagar un producto, o
 * corregir un precio, se ve sin reconstruir el sitio.
 *
 * ⚠️ **Arranca con lo horneado, no con una pantalla vacía.** Es la diferencia con una
 * SPA: el primer pintado ya trae productos (y Google y WhatsApp siguen leyéndolos del
 * HTML). Si la API tarda o falla, lo horneado es lo que queda — por eso `error` es un
 * aviso, no una pantalla en blanco.
 *
 * ⚠️ **No reintenta.** Un catálogo que se repregunta solo golpea una API con tope de
 * 120 peticiones por minuto, y acá el costo de fallar es ver datos de hace un rato, no
 * perder nada. Quien quiera reintentar, recarga.
 *
 * ⚠️ **`error` y `noExiste` son estados DISTINTOS y conservar lo horneado solo vale
 * para el primero.** Si la API no contesta, lo del último build es lo mejor que hay. Si
 * la API contesta que el producto ya no está, lo horneado es justamente lo que NO hay
 * que mostrar: es la ficha de algo que no se vende. Mezclarlos fue el bug.
 */
export function useEnVivo<T>(
  inicial: T,
  cargar: () => Promise<T>,
): { datos: T; error: boolean; noExiste: boolean } {
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState(false);
  const [noExiste, setNoExiste] = useState(false);
  // La función de carga suele venir como literal: sin la ref, cambiaría en cada render y
  // el efecto volvería a pedir en bucle.
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    let vivo = true;
    cargarRef
      .current()
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (!vivo) return;
        if (e instanceof NoExiste) setNoExiste(true);
        else setError(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  return { datos, error, noExiste };
}
