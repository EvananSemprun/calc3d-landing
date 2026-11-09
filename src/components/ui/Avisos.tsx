// Los avisos flotantes del sitio (sonner). Isla GLOBAL: se monta una sola vez en
// `Base.astro`, igual que el cajón del carrito.
//
// ⚠️ `toast()` empuja a un store global que SOLO se pinta si hay un `<Toaster />`
// montado. Sin esta isla, cada `toast()` del sitio es un no-op silencioso: no hay
// error en consola, no falla el build, simplemente no pasa nada. Si algún día
// desaparece de `Base`, los avisos de "agregado al pedido" se vuelven invisibles.
//
// Es la ÚNICA librería de avisos del repo: no sumar otra (dos sistemas conviviendo
// es el problema, no la solución).
import { Toaster } from 'sonner';

export default function Avisos() {
  return (
    <Toaster
      // El sitio es oscuro siempre (`<html class="dark">`): se fija, no se deduce.
      theme="dark"
      // Abajo y al centro: en el teléfono queda a la vista sin tapar el botón de
      // agregar, que vive a media página.
      position="bottom-center"
      // Los colores salen de los tokens de marca en global.css (`.toaster`), no de
      // la paleta de sonner.
      duration={4000}
      // El enganche de los estilos de marca (global.css, al final y fuera de `@layer`).
      // sonner no le pone ninguna clase propia al contenedor: sin esto no hay dónde
      // pisarle sus variables de color.
      className="bl-toaster"
    />
  );
}
