# Modifier ton site avec Claude Code

Guide pour toi, André. Tu peux modifier le bot et le tableau de bord en écrivant en français à Claude, sans connaître le code.

**Important : 90% des changements ne demandent PAS Claude Code.** Lis la section "Choses à faire dans `admin.andjix.ca` plutôt qu'avec Claude Code" plus bas avant de commencer.

---

## Quand utiliser Claude Code

Utilise Claude Code seulement pour :

- **Changer le ton ou la personnalité du bot** (ex : "rends le bot plus formel")
- **Ajouter une nouvelle section au site** (ex : "ajoute une page Témoignages")
- **Modifier l'apparence** (couleurs, typos)
- **Corriger un bug** que tu remarques sur le site ou le bot
- **Ajouter une nouvelle intégration** (ex : connecter Slack, Telegram)

Pour tout le reste, utilise `admin.andjix.ca` (voir plus bas).

---

## Étape 1 — Créer ton compte Anthropic

1. Va sur https://console.anthropic.com → **Sign up**
2. Utilise `info.andjix@gmail.com`
3. Ajoute une carte de crédit (Claude Code facture à l'usage, ~5-20 $/mois pour un usage modéré)
4. Dans **Limits**, fixe une limite mensuelle (ex : 30 $) pour éviter les mauvaises surprises

---

## Étape 2 — Installer Claude Code

Sur Mac (Terminal) :

```bash
curl -fsSL https://claude.ai/install.sh | sh
```

Puis :
```bash
claude
```

Il te demandera de te connecter à ton compte Anthropic. Suis les instructions.

> **Alternative sans terminal :** va sur https://claude.ai/code (version web) et connecte ton compte GitHub `infoandjix`. Tu pourras faire les mêmes choses depuis le navigateur.

---

## Étape 3 — Cloner ton projet

Une seule fois :

```bash
cd ~
git clone https://github.com/infoandjix/andjix.git
cd andjix
```

Tu auras maintenant un dossier `~/andjix/` qui contient tout ton code.

---

## Étape 4 — Configurer git (important !)

**Sans cette étape, tes changements ne se déploieront pas sur Vercel.**

```bash
cd ~/andjix
git config user.email info.andjix@gmail.com
git config user.name "Andjix"
```

C'est lié à la formule gratuite Vercel : seul `info.andjix@gmail.com` peut déployer. Si quelqu'un d'autre (ton développeur futur, ton frère, ChatGPT en local) essaye de déployer avec un autre courriel, ça échoue silencieusement.

---

## Étape 5 — Lancer Claude Code

```bash
cd ~/andjix
claude
```

Tu verras un prompt. Tu peux maintenant écrire en français.

### Exemples de demandes qui marchent bien

> "Change la couleur du bouton 'Réserver un appel' du bleu au vert."

> "Ajoute une nouvelle question fréquente sur le site : Combien coûte une consultation fiscale ?"

> "Le bot répond trop sèchement, rends-le plus chaleureux et utilise le tutoiement."

> "Ajoute mon numéro WhatsApp au pied de page du site."

Claude va :
1. Lire le code concerné
2. Te proposer les changements (tu peux dire oui ou non)
3. Faire les modifications
4. Committer et pousser sur GitHub
5. Vercel déploiera automatiquement en 30 secondes

---

## Choses à faire dans `admin.andjix.ca` (PAS Claude Code)

Ces tâches ne demandent **aucun code** :

| Tâche | Où le faire |
|---|---|
| Changer l'URL Calendly | admin.andjix.ca → Paramètres |
| Changer le courriel de notification des prospects | admin.andjix.ca → Paramètres |
| Ajouter une promotion ou un tarif spécial que le bot doit mentionner | admin.andjix.ca → Paramètres → Notes additionnelles |
| Ajouter ou retirer un administrateur | admin.andjix.ca → Administrateurs |
| Voir un nouveau prospect ou réservation | admin.andjix.ca → Prospects / Réservations |
| Voir l'historique d'une conversation | admin.andjix.ca → Utilisateurs |

**Règle simple : si la donnée à changer est un fait (URL, courriel, prix, promo, info saisonnière), c'est dans Paramètres. Si c'est une fonctionnalité ou une apparence, c'est dans Claude Code.**

---

## Si Claude Code te demande quelque chose que tu ne comprends pas

Tu peux toujours lui dire :
- *"Explique-moi en français simple ce que tu veux faire."*
- *"Je ne suis pas développeur, montre-moi l'effet sans le code."*
- *"Avant de pousser, fais un essai local."*

Claude est patient et te répondra dans ton langage.

---

## Que faire si quelque chose se casse

1. **Le site ne se met pas à jour après un push ?** Vérifie que ton commit a bien l'email `info.andjix@gmail.com` :
   ```bash
   git log -1 --format="%ae"
   ```
   Si c'est autre chose, tes commits ne déploieront pas. Re-fais l'Étape 4.

2. **Le site affiche une erreur ?** Va sur https://vercel.com → andjix-ai → Deployments. Le dernier déploiement raté te montrera l'erreur.

3. **Le bot ne répond plus ?** C'est probablement ta limite Anthropic atteinte. Va sur console.anthropic.com → Usage. Augmente la limite ou attends le mois prochain.

4. **Tu es perdu ?** Ouvre Claude Code et dis :
   > "J'ai cassé quelque chose en faisant X. Aide-moi à annuler les derniers changements."

   Claude peut faire `git revert` pour annuler proprement.

---

## Comparé à payer un développeur

| Approche | Coût mensuel | Délai d'un changement | Disponibilité |
|---|---|---|---|
| Développeur freelance | 75-150 $/h | Quelques jours | Heures de bureau |
| Claude Code | 5-30 $/mois total | Quelques minutes | 24/7 |
| Cabinet web | 500-2000 $/mois forfait | Une semaine | Heures de bureau |

Claude Code n'est pas magique : il fait des erreurs comme un humain et il faut le superviser. Mais pour 95% des petits changements, ça suffit largement.

---

## Sécurité

- **Ne partage jamais ta clé API Anthropic** (commence par `sk-ant-...`)
- Si tu soupçonnes une fuite, va sur console.anthropic.com et révoque la clé
- Le projet GitHub est privé — seul toi et tes collaborateurs explicites y ont accès
- Claude Code ne modifie jamais tes données clients (Firestore, Airtable) — il modifie seulement le code

---

## Aller plus loin

- Documentation Claude Code (anglais) : https://docs.claude.com/en/docs/claude-code
- Documentation Vercel : https://vercel.com/docs
- Documentation Firebase : https://firebase.google.com/docs

Pour comprendre l'architecture technique du projet (en anglais), lis `CLAUDE.md` dans la racine du repo.
