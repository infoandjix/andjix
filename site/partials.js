/**
 * Shared nav + footer for all Andjix pages.
 * Loaded BEFORE i18n.js so the data-i18n attributes inside the
 * injected markup are translated on the same DOMContentLoaded pass.
 */
(function () {
  function active(href) {
    const path = location.pathname.split('/').pop() || 'index.html';
    return path === href ? ' aria-current="page"' : '';
  }

  const NAV_HTML = `
<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo" aria-label="Andjix Consulting">
      <img src="assets/logo.svg" alt="Andjix Consulting" />
      <span class="nav-logo-text">Andjix Consulting Inc.</span>
    </a>
    <button class="nav-burger" aria-label="Menu" data-nav-toggle>
      <span></span><span></span><span></span>
    </button>
    <div class="nav-links" data-nav-panel>

      <!-- Particuliers -->
      <div class="nav-dd">
        <button class="nav-dd-btn${active('services-particuliers.html') ? ' active' : ''}">
          <span data-i18n="nav.particuliers">Particuliers</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="nav-dd-panel">
          <a href="services-particuliers.html#impots" class="dd-item">
            <div class="dd-icon dd-icon-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.fiscalite">Déclaration d'impôts</div><div class="dd-desc" data-i18n="nav.fiscalite_desc">T1, T2125, T2 · Première année au Canada · EFILE ARC</div></div>
          </a>
          <a href="services-particuliers.html#nouveaux-arrivants" class="dd-item">
            <div class="dd-icon dd-icon-deep"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.arrivants">Nouveaux arrivants</div><div class="dd-desc" data-i18n="nav.arrivants_desc">NAS, OHIP, école, logement · 90 premiers jours</div></div>
          </a>
          <a href="services-particuliers.html#conseil" class="dd-item">
            <div class="dd-icon dd-icon-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.conseil">Conseil administratif</div><div class="dd-desc" data-i18n="nav.conseil_desc">Avis de cotisation, TPS/TVH, acomptes provisionnels</div></div>
          </a>
        </div>
      </div>

      <!-- Placement -->
      <div class="nav-dd">
        <button class="nav-dd-btn${(active('placement-candidats.html') || active('placement-employeurs.html')) ? ' active' : ''}">
          <span data-i18n="nav.placement">Placement</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="nav-dd-panel">
          <a href="placement-candidats.html" class="dd-item">
            <div class="dd-icon dd-icon-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.placement_cand">Je cherche un emploi</div><div class="dd-desc" data-i18n="nav.placement_cand_desc">CV canadien, réseau Andjix, coaching entrevue · Gratuit pour vous</div></div>
          </a>
          <a href="placement-employeurs.html" class="dd-item">
            <div class="dd-icon dd-icon-orange"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.placement_emp">Je cherche du personnel</div><div class="dd-desc" data-i18n="nav.placement_emp_desc">3 niveaux · Garantie 60 jours · Premiers CV en 5 jours</div></div>
          </a>
        </div>
      </div>

      <!-- PME -->
      <div class="nav-dd">
        <button class="nav-dd-btn${active('services-pme.html') ? ' active' : ''}">
          <span data-i18n="nav.sme">PME</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="nav-dd-panel">
          <a href="services-pme.html#automatisation" class="dd-item">
            <div class="dd-icon dd-icon-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.automation">Automatisation IA</div><div class="dd-desc" data-i18n="nav.automation_desc">CRM, formulaires intelligents, flux de travail intégrés</div></div>
          </a>
          <a href="services-pme.html#constitution" class="dd-item">
            <div class="dd-icon dd-icon-red"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div><div class="dd-title" data-i18n="nav.incorporation">Constitution d'entreprise</div><div class="dd-desc" data-i18n="nav.incorporation_desc">NUANS, fédéral/Ontario, NE, TPS/TVH, conformité PME</div></div>
          </a>
        </div>
      </div>

      <a href="ia.html"${active('ia.html')} data-i18n="nav.ai">Andjix IA</a>
      <a href="about.html"${active('about.html')} data-i18n="nav.about">À propos</a>
      <button class="lang-toggle" aria-label="Changer de langue" data-lang-toggle>
        <span data-lang-current>EN</span>
      </button>
      <a href="contact.html#rdv" class="nav-cta" data-i18n="nav.cta">Prendre rendez-vous</a>
    </div>
  </div>
</nav>`;

  const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="assets/logo.svg" alt="Andjix" />
          <div>
            <div class="footer-brand-text">Andjix Consulting Inc.</div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); letter-spacing: 0.08em;">OTTAWA · CANADA</div>
          </div>
        </div>
        <p class="footer-tag" data-i18n="footer.tag">Accompagnement fiscal, professionnel et administratif à Ottawa et Gatineau. Bilingue FR/EN.</p>
      </div>
      <div>
        <h5 data-i18n="footer.h_particuliers">Particuliers</h5>
        <div class="footer-links">
          <a href="services-particuliers.html#impots" data-i18n="nav.fiscalite">Déclaration d'impôts</a>
          <a href="services-particuliers.html#nouveaux-arrivants" data-i18n="nav.arrivants">Nouveaux arrivants</a>
          <a href="services-particuliers.html#conseil" data-i18n="nav.conseil">Conseil administratif</a>
        </div>
      </div>
      <div>
        <h5 data-i18n="footer.h_placement">Placement</h5>
        <div class="footer-links">
          <a href="placement-candidats.html" data-i18n="nav.placement_cand">Je cherche un emploi</a>
          <a href="placement-employeurs.html" data-i18n="nav.placement_emp">Je cherche du personnel</a>
          <a href="services-pme.html#automatisation" data-i18n="nav.automation">Automatisation IA</a>
          <a href="services-pme.html#constitution" data-i18n="nav.incorporation">Constitution d'entreprise</a>
        </div>
      </div>
      <div>
        <h5 data-i18n="footer.h_andjix">Andjix</h5>
        <div class="footer-links">
          <a href="ia.html" data-i18n="footer.l_bot">Andjix IA</a>
          <a href="about.html" data-i18n="nav.about">À propos</a>
          <a href="contact.html#rdv" data-i18n="footer.l_book">Prendre rendez-vous</a>
          <a href="mailto:info.andjix@gmail.com">info.andjix@gmail.com</a>
          <a href="tel:+16132768401">+1 613 276 8401</a>
          <a href="confidentialite.html" data-i18n="footer.l_privacy">Politique de confidentialité</a>
          <a href="mentions-legales.html" data-i18n="footer.l_legal">Mentions légales</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© <span id="year"></span> Andjix Consulting Inc. <span data-i18n="footer.rights">Tous droits réservés.</span></div>
    </div>
  </div>
</footer>`;

  document.querySelectorAll('[data-include="nav"]').forEach(el => el.outerHTML = NAV_HTML);
  document.querySelectorAll('[data-include="footer"]').forEach(el => el.outerHTML = FOOTER_HTML);

  // Mobile nav toggle (after injection)
  const burger = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-nav-panel]');
  if (burger && panel) {
    burger.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
  }
})();
