/**
 * Andjix site configuration — André edits this file once and CTAs across the
 * whole site pick up his URLs. Do not commit real secrets here; only public
 * URLs (Calendly, Typeform) belong in this file.
 *
 * After editing, redeploy with: vercel --prod --yes (from this folder)
 */
window.ANDJIX = {
  // Calendly — single scheduling URL for "Réserver une consultation"
  calendly: "https://calendly.com/info-andjix/entretien-candidat-placement",

  // Typeform — one form per service line. Replace REPLACE_ME with the form's
  // public URL (https://andjix.typeform.com/to/XXXXXXXX).
  typeform: {
    impots: "https://form.typeform.com/to/PyTR3rdn",
    newcomer: "https://form.typeform.com/to/Be3hTwkz",
    placement: "https://form.typeform.com/to/dXDOcsP5",
  },

  // Bilingual labels swapped by i18n.js based on document.documentElement.lang
  labels: {
    fr: {
      book: "Réserver une consultation",
      start: "Démarrer mon dossier",
    },
    en: {
      book: "Book a consultation",
      start: "Start my file",
    },
  },
};
