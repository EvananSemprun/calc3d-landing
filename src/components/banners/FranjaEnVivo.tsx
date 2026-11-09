import Cruce from '@/components/ui/Cruce';
import { fetchBanners } from '@/lib/api';
import { textoDeBanner } from '@/lib/banner';
import { useEnVivo } from '@/lib/vivo';

/**
 * El texto de la franja de arriba, EN VIVO.
 *
 * Lo pone un banner de TEXTO desde el panel; sin ninguno cargado queda el de siempre
 * (decisión del dueño: la franja nunca es un hueco). Pinta lo horneado y al montar
 * vuelve a preguntar, así prender o apagar ese banner se ve sin reconstruir.
 *
 * ⚠️ El respaldo vive acá y NO en el servidor: `textoDeBanner` devuelve null cuando no
 * hay banner de texto, y es este componente el que decide qué poner en su lugar. Una
 * sola definición del respaldo, para el build y para el refresco.
 */
export default function FranjaEnVivo({ inicial, respaldo }: { inicial: string | null; respaldo: string }) {
  const { datos } = useEnVivo(inicial, async () => textoDeBanner(await fetchBanners()));
  const texto = datos ?? respaldo;
  // El texto de la franja es un nodo suelto dentro del `<span>` del emoji (`Header.astro`),
  // así que para fundirlo hace falta envolverlo. Prender o apagar el banner de texto desde
  // el panel cruza en vez de saltar; el respaldo cuenta como un valor más (si el dueño
  // apaga el banner, el texto de siempre vuelve cruzando).
  return <Cruce valor={texto}>{texto}</Cruce>;
}
