import './styles.css';

// Año dinámico en el pie.
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Menú móvil.
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn?.addEventListener('click', () => {
  const open = mobileMenu?.classList.toggle('hidden') === false;
  menuBtn.setAttribute('aria-expanded', String(open));
});
// Cerrar el menú al tocar un enlace.
mobileMenu?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => mobileMenu.classList.add('hidden')),
);

// Reveal progresivo al hacer scroll.
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// FAQ: acordeón accesible (un <details> nativo ya funciona; esto solo cierra
// los demás al abrir uno, para que se lea de a uno).
const faqs = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.faq'));
faqs.forEach((d) =>
  d.addEventListener('toggle', () => {
    if (d.open) faqs.filter((o) => o !== d).forEach((o) => (o.open = false));
  }),
);
