# Guide d'opérations Andjix AI

Bienvenue André. Ce guide te montre comment gérer le bot et le tableau de bord toi-même, sans avoir besoin de me contacter pour chaque ajustement. La majorité des changements prennent moins de deux minutes.

**Tout se passe à : [admin.andjix.ca](https://admin.andjix.ca)**

Connecte-toi avec `info.andjix@gmail.com` (compte Google).

---

## 1. Voir un nouveau prospect (lead)

1. Onglet **Prospects**
2. Clique sur n'importe quel prospect pour ouvrir le détail
3. Tu vois : nom, courriel, téléphone, segment, besoin résumé, et la **conversation complète** que la personne a eue avec le bot avant de soumettre le formulaire

Tu reçois aussi automatiquement un courriel à `info.andjix@gmail.com` à chaque nouveau prospect.

## 2. Voir les rendez-vous Calendly réservés

1. Onglet **Réservations**
2. Liste de toutes les réservations Calendly avec : nom, date/heure, lien pour reprogrammer ou annuler

Si l'onglet est vide alors que tu sais qu'il y a eu des réservations, c'est que le webhook Calendly n'est pas configuré. Voir section "Configurer Calendly" plus bas.

## 3. Voir l'historique des conversations d'un utilisateur connecté

1. Onglet **Utilisateurs**
2. Clique sur n'importe quel utilisateur
3. Tu vois toute la conversation persistée (les utilisateurs anonymes n'ont pas d'historique sauvegardé)

## 4. Modifier l'URL Calendly que le bot propose

Changement utile si tu changes de plan Calendly, ou si tu veux pointer vers un autre type d'événement (ex. consultation payante vs gratuite).

1. Onglet **Paramètres**
2. Champ **URL Calendly** : colle la nouvelle URL
3. Bouton **Enregistrer**

**Le bot utilise la nouvelle URL immédiatement, sans redéploiement.**

## 5. Modifier ce que le bot sait (notes additionnelles)

C'est la fonction la plus puissante du dashboard. Tout ce que tu écris dans **Notes additionnelles pour le bot** est injecté dans son contexte à chaque nouvelle conversation. Le bot l'utilise comme s'il s'agissait de connaissance officielle d'Andjix.

**Exemples de notes utiles :**
- *Promo de mars : déclaration d'impôts à 60 $ jusqu'au 15 mars 2026 pour les nouveaux clients.*
- *Nouveau service : accompagnement à la résidence permanente, 250 $/h, sur rendez-vous.*
- *Important : Andjix est fermé du 23 décembre au 3 janvier pour les fêtes.*
- *Si la personne mentionne un permis de travail fermé, on ne traite pas ce type de dossier. Redirige vers un avocat en immigration.*

**Comment faire :**
1. Onglet **Paramètres**
2. Champ **Notes additionnelles pour le bot**
3. Écris en français naturel (le bot parle FR et EN)
4. Bouton **Enregistrer**

**Effet immédiat sur les conversations suivantes.** Pas besoin de me contacter.

> Évite d'y mettre des infos sensibles (numéros de clients, informations confidentielles). Tout ce qui est dans ces notes peut être mentionné par le bot.

## 6. Modifier le courriel de notification des prospects

1. Onglet **Paramètres**
2. Champ **Email de notification (prospects)**
3. Enregistrer

Utile si tu veux qu'un collègue reçoive aussi ces notifications, ou si tu changes de boîte de réception.

## 7. Ajouter un administrateur (autoriser un collègue à accéder au dashboard)

1. Onglet **Administrateurs**
2. Saisis le courriel Google de la personne
3. **Ajouter**
4. La personne se connecte à `admin.andjix.ca` avec ce courriel. Elle a accès immédiatement.

Pour **retirer** quelqu'un, clique sur "Retirer" à droite de son nom dans la liste.

## 8. Récupérer une transcription pour ton dossier client

1. Onglet **Prospects** ou **Utilisateurs**
2. Ouvre la conversation
3. Sélectionne le texte, copie, colle dans le dossier client

## 9. Configurer Calendly pour qu'il alimente le dashboard

À faire une seule fois :

1. Va dans Calendly → **Integrations** → **Webhooks**
2. Clique **Create Webhook Subscription**
3. URL : `https://ai.andjix.ca/api/calendly`
4. Coche les événements : **Invitee Created** et **Invitee Canceled**
5. Sauvegarde

À partir de ce moment, chaque réservation et annulation apparaît dans l'onglet **Réservations** automatiquement, et est aussi envoyée à Airtable si tu as configuré Make.com.

---

## Quand tu as besoin de moi

Garde-moi dans la boucle pour ces choses :

- Nouveau **service** majeur à ajouter au site marketing (andjix.ca)
- **Refonte visuelle** ou ajout de page
- **Bug** du bot ou du dashboard (capture d'écran + URL = bonus)
- Nouvelle **intégration** (CRM différent, paiement en ligne, etc.)
- Augmentation de **trafic** importante (besoin de revoir les limites)

**Pour tout le reste (changement de tarif, de promo, de disponibilité Calendly, de notes du bot, d'admin), tu es autonome.**

---

## Limites à connaître

- Le bot apprend des **notes additionnelles** que tu écris, mais sa "personnalité" et son cadre de base (segments, ton, langues, escalade vers réservation) restent dans le code. Si tu veux changer son ton ou ses garde-fous, contacte-moi.
- **Anthropic facture à l'usage.** Surveille tes coûts sur [console.anthropic.com](https://console.anthropic.com). Mets une limite mensuelle dans **Limits**.
- Le mode incognito n'enregistre **pas** l'historique côté utilisateur (anonymes). Seuls les utilisateurs connectés ont leur historique sauvegardé.
