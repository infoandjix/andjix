/**
 * Shared page initialization for Andjix.
 * - Adds 'js' class so reveal-on-scroll CSS kicks in
 * - Sets the footer year
 * - Triggers reveal animations via IntersectionObserver, with a 2s fallback
 *   so content always becomes visible even when the observer misses an element
 *   (e.g. printing, prefers-reduced-motion, fast scrolling, screenshot tools)
 * - Handles nav scrolled state
 */
(function () {
  document.documentElement.classList.add('js');

  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const siblings = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
        const i = siblings.indexOf(e.target);
        if (i > 0) e.target.style.transitionDelay = (i * 80) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('in'));
  }

  setTimeout(() => els.forEach(el => el.classList.add('in')), 2000);

  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Wire Calendly + Typeform CTAs from window.ANDJIX (set in andjix-config.js).
  // Anchors with data-calendly-link → href = window.ANDJIX.calendly
  // Anchors with data-typeform="impots|newcomer|placement" → href = matching URL
  // Anchors that point to a REPLACE_ME URL get disabled (gray + alert) so
  // André can spot unconfigured CTAs in QA before going live.
  const cfg = window.ANDJIX || {};
  const calendly = cfg.calendly;
  document.querySelectorAll('[data-calendly-link]').forEach(a => {
    if (calendly && calendly !== 'REPLACE_ME') {
      a.setAttribute('href', calendly);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      a.addEventListener('click', e => { e.preventDefault(); alert('Calendly à configurer dans andjix-config.js'); });
    }
  });
  document.querySelectorAll('[data-typeform]').forEach(a => {
    const key = a.getAttribute('data-typeform');
    const url = cfg.typeform && cfg.typeform[key];
    if (url && url !== 'REPLACE_ME') {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      a.addEventListener('click', e => { e.preventDefault(); alert('Typeform "' + key + '" à configurer dans andjix-config.js'); });
    }
  });
})();
