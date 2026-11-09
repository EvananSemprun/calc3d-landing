// La silueta de la ficha, para el rato en que la respuesta de la API viaja y no hay nada
// horneado que mostrar (el rescate de un producto creado después del último despliegue).
//
// Antes acá había un «Cargando el producto…» suelto en el medio de la nada y, al llegar la
// respuesta, la ficha entera aparecía de golpe empujando el pie del sitio.
//
// ⚠️ **REUSA LAS CLASES DE LA FICHA DE VERDAD** (`.pdp`, `.pdp-gallery`, `.pdp-main`,
// `.pdp-info`, `.pdp-buy`), y eso es lo importante: la grilla, los huecos entre piezas y
// el `aspect-ratio` de la galería salen del MISMO CSS que la ficha, así que no hay un
// segundo juego de medidas que mantener de acuerdo. Lo único propio son las barras, con
// los altos medidos de la ficha (ver `styles/global.css`, «El esqueleto de la ficha»).
//
// ⚠️ **No hay barra para las insignias.** En la ficha de verdad `.pdp-badges` solo se
// dibuja si el producto tiene alguna, así que reservarle lugar siempre sería un hueco de
// 30 px de más en la mayoría de las fichas: peor que no reservarlo.
//
// ⚠️ **El esqueleto no se mueve.** Un esqueleto que late lo hace en bucle, y el techo de
// movimiento del plan es `--dur-lenta` (420 ms): un ciclo de 420 ms son ~2,4 destellos por
// segundo, y cualquier ciclo decente se sale del techo o pide un token nuevo, que el plan
// prohíbe. Quieto ya comunica lo que tiene que comunicar: la forma de lo que viene, en el
// lugar donde va a estar. Lo fija `src/esqueleto-mide.spec.ts`.
export default function EsqueletoFicha() {
  return (
    <div className="pdp esqueleto" role="status">
      {/* El aviso sigue existiendo para quien no ve la silueta: `role="status"` sin texto
          no anuncia nada. */}
      <span className="sr-only">Cargando el producto…</span>

      <div className="pdp-gallery">
        {/* El hueco de la foto es `.pdp-main` pelada: su `aspect-ratio: 1 / 1` ya es
            exactamente el alto que va a ocupar la foto. */}
        <div className="pdp-main" />
      </div>

      <div className="pdp-info">
        <div className="esqueleto-barra esq-titulo" />
        <div className="esqueleto-barra esq-hechos" />
        <div className="esqueleto-barra esq-precio" />
        <div className="esqueleto-barra esq-unidad" />

        {/* La descripción: tres renglones, porque el largo real no se puede saber antes de
            que llegue. Van dentro de su propio contenedor para que entre ellos quede la
            interlínea del párrafo y no el hueco de 16 px de `.pdp-info`. */}
        <div className="esqueleto-texto">
          <div className="esqueleto-barra esq-renglon" />
          <div className="esqueleto-barra esq-renglon" />
          {/* El último sale más corto (`:last-child` en el CSS): un párrafo no termina
              justo en el margen. */}
          <div className="esqueleto-barra esq-renglon" />
        </div>

        <div className="pdp-buy">
          <div className="esqueleto-barra esq-cantidad" />
          <div className="esqueleto-barra esq-boton" />
        </div>
      </div>
    </div>
  );
}
