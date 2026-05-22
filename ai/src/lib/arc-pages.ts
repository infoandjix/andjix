// List of key ARC (Canada Revenue Agency) pages to scrape for Andjix AI's knowledge base.
// Add or remove pages here to expand/reduce fiscal coverage.

export interface ArcPageConfig {
  topic: string;   // Firestore doc ID
  title: string;   // Human-readable title
  url: string;     // ARC page URL
  keywords: string[]; // Keywords used to match this page to user questions
}

// --- Tax-related keywords (FR + EN) used to decide whether to inject ARC knowledge ---
export const TAX_KEYWORDS: string[] = [
  // French
  "impôt", "fiscal", "fiscale", "fiscaux", "déclaration", "déduction",
  "crédit d'impôt", "remboursement", "tps", "tvh", "t1", "t2", "t4", "t2125",
  "reer", "celi", "ace", "nr74", "revenu", "travailleur autonome", "société",
  "cotisation", "acompte provisionnel", "date limite", "échéance", "retenue",
  "feuillet", "frais médicaux", "scolarité", "don de bienfaisance", "télétravail",
  "arc", "agence du revenu", "mon dossier arc", "déclarer", "produire ma déclaration",
  "rapport d'impôt", "allocation canadienne", "compte épargne libre", "retraite",
  "régime enregistré", "paiement impôt", "remboursement impôt",
  // English
  "tax", "taxes", "income tax", "tax return", "deduction", "credit", "refund",
  "gst", "hst", "rrsp", "tfsa", "ccb", "self-employed", "t4 slip",
  "cra", "canada revenue", "my account cra", "filing", "file taxes",
  "medical expenses", "tuition", "charitable", "payroll",
];

// --- Pages to scrape ---
export const ARC_PAGES: ArcPageConfig[] = [
  {
    topic: "arc-accueil",
    title: "Agence du revenu du Canada — Accueil",
    url: "https://www.canada.ca/fr/agence-revenu.html",
    keywords: ["arc", "agence du revenu", "cra", "canada revenue", "services fiscaux"],
  },
  {
    topic: "particuliers",
    title: "Impôt des particuliers",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers.html",
    keywords: ["particulier", "t1", "déclaration revenus", "impôt revenu"],
  },
  {
    topic: "dates-limites",
    title: "Quand produire votre déclaration",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fixez-votre-declaration/quand-devez-vous-produire-votre-declaration.html",
    keywords: ["date limite", "échéance", "30 avril", "15 juin", "délai production"],
  },
  {
    topic: "travailleurs-autonomes",
    title: "Travailleurs autonomes — déclaration",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/travailleur-autonome/declaration.html",
    keywords: ["travailleur autonome", "self-employed", "t2125", "revenus d'entreprise", "uber", "lyft"],
  },
  {
    topic: "tps-tvh",
    title: "TPS/TVH pour les entreprises",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/taxe-produits-services-taxe-harmonisee-tps-tvh.html",
    keywords: ["tps", "tvh", "gst", "hst", "taxe vente", "inscription tps", "30 000"],
  },
  {
    topic: "ace",
    title: "Allocation canadienne pour enfants (ACE)",
    url: "https://www.canada.ca/fr/agence-revenu/services/prestations-enfants-familles/allocation-canadienne-enfants-apercu.html",
    keywords: ["ace", "ccb", "allocation enfants", "prestation enfants", "famille"],
  },
  {
    topic: "credit-tps",
    title: "Crédit pour la TPS/TVH (particuliers)",
    url: "https://www.canada.ca/fr/agence-revenu/services/prestations-enfants-familles/credit-tps-tvh.html",
    keywords: ["crédit tps", "gst credit", "remboursement taxe", "faible revenu"],
  },
  {
    topic: "reer",
    title: "REER — Régime enregistré d'épargne-retraite",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-sur-reer-reerr-fonds-revenu-retraite.html",
    keywords: ["reer", "rrsp", "retraite", "cotisation reer", "droits reer"],
  },
  {
    topic: "celi",
    title: "CELI — Compte d'épargne libre d'impôt",
    url: "https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/rc4466/guide-compte-epargne-libre-impot-celi-particuliers.html",
    keywords: ["celi", "tfsa", "épargne libre", "droits celi", "plafond celi"],
  },
  {
    topic: "frais-medicaux",
    title: "Crédit d'impôt pour frais médicaux",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fixez-votre-declaration/details-declarations/credits-deductions/credit-impot-frais-medicaux.html",
    keywords: ["frais médicaux", "médical", "médicaments", "dentiste", "optométriste"],
  },
  {
    topic: "t2-societes",
    title: "Déclaration de revenus des sociétés (T2)",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/societes/declaration-de-revenus-societes.html",
    keywords: ["t2", "société", "corporation", "impôt sociétés", "entreprise incorporée"],
  },
  {
    topic: "frais-scolarite",
    title: "Montant pour frais de scolarité",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fixez-votre-declaration/details-declarations/credits-deductions/frais-scolarite-deductibles.html",
    keywords: ["frais scolarité", "tuition", "étudiant", "t2202", "formation"],
  },
  {
    topic: "dons",
    title: "Dons de bienfaisance",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fixez-votre-declaration/details-declarations/credits-deductions/dons-bienfaisance-autres.html",
    keywords: ["don", "bienfaisance", "charity", "reçu officiel", "organisme"],
  },
  {
    topic: "paiements",
    title: "Effectuer un paiement à l'ARC",
    url: "https://www.canada.ca/fr/agence-revenu/services/paiements-arc.html",
    keywords: ["paiement", "payer impôt", "comment payer", "versement arc", "interac"],
  },
  {
    topic: "mon-dossier",
    title: "Mon dossier pour les particuliers (ARC en ligne)",
    url: "https://www.canada.ca/fr/agence-revenu/services/services-electroniques/services-electroniques-particuliers/mon-dossier-pour-les-particuliers.html",
    keywords: ["mon dossier", "my account", "en ligne arc", "accès arc", "compte en ligne"],
  },
  {
    topic: "nouveaux-residents",
    title: "Nouveaux résidents — fiscalité canadienne",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/frequemment-posees/particuliers/je-viens-d-immigrer-canada-dois-je-produire-declaration-revenues-canadienne.html",
    keywords: ["nouveau résident", "immigrant", "arrivée canada", "première déclaration", "résidence fiscale"],
  },
  {
    topic: "t4",
    title: "T4 — État de la rémunération payée",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/retenues-paie/feuillets-releves/t4-etat-de-la-remuneration-payee.html",
    keywords: ["t4", "feuillet t4", "rémunération", "employeur feuillet"],
  },
  {
    topic: "retenues-paie",
    title: "Retenues sur la paie",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/retenues-paie.html",
    keywords: ["retenues paie", "payroll", "déductions paie", "rpc", "ae", "assurance emploi"],
  },
  {
    topic: "depenses-bureau",
    title: "Dépenses de bureau à domicile (télétravail)",
    url: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fixez-votre-declaration/details-declarations/credits-deductions/frais-de-bureau-a-domicile-des-employes.html",
    keywords: ["télétravail", "bureau domicile", "work from home", "t2200", "dépenses emploi"],
  },
  {
    topic: "acomptes",
    title: "Acomptes provisionnels pour particuliers",
    url: "https://www.canada.ca/fr/agence-revenu/services/paiements-arc/acomptes-provisionnels/particuliers/acomptes-provisionnels-particuliers-introduction.html",
    keywords: ["acompte provisionnel", "quarterly payment", "instalment", "paiement trimestriel"],
  },
];
