# Template — Documentation complète

> **But de ce document** : donner une vue exhaustive du **template** utilisé pour
> démarrer chaque nouveau projet client — fonctionnalités, design system,
> architecture, et surtout **l'historique des bugs majeurs déjà rencontrés et
> résolus** (trouvés en travaillant sur les premiers clients réels : Brooklyn
> Food, La Merguez Du Chef). Sert de checklist pour tout nouveau client, et de
> référence pour comparer/synchroniser les projets déjà en production.
>
> Dernière mise à jour : 2026-07-01. À tenir à jour à chaque changement notable
> — **ce fichier voyage avec chaque client** (cloné depuis le template), donc
> toute mise à jour ici doit idéalement être portée vers les clients existants.
>
> 🗂️ **Ce dépôt fait partie d'un système multi-clients** (plusieurs restaurants,
> code très similaire, déploiements séparés). La vue d'ensemble de ce système —
> workflow de propagation des correctifs, registre des clients, procédure pour
> démarrer un nouveau projet — est documentée dans
> `C:\Users\thoub\.claude\RESTAURANT-APPS-SYSTEM.md` (à lire en complément de ce
> fichier, surtout avant de démarrer un nouveau client).

---

## 1. Vue d'ensemble

| | |
|---|---|
| **Type de commerce** | Restaurants — à personnaliser par client (voir `data/config.json`) |
| **Modèle de commande** | À emporter (`takeaway`) par défaut. Livraison possible (code déjà présent, désactivé par défaut). **Aucun paiement en ligne** — le client paie sur place, sauf besoin spécifique d'un client (voir §4 de `RESTAURANT-APPS-SYSTEM.md`). |
| **Établissements** | Mono ou multi-établissements selon le client (`data/config.json` → tableau `locations`) — aucune réécriture de code nécessaire pour en ajouter. |
| **Origine** | Base de code consolidée à partir des deux premiers clients réels (Brooklyn Food, La Merguez Du Chef) — tous les correctifs qui y ont été trouvés sont déjà intégrés ici. |
| **Dépôt** | GitHub `Thouby17/restaurant-app-template` (dépôt **privé**, jamais déployé tel quel) |

---

## 2. Stack technique

| Brique | Version | Rôle |
|---|---|---|
| Next.js | ^15.1.0 (App Router) | Framework full-stack |
| React | ^19.0.0 | UI |
| TypeScript | ^5.7.0 | Typage |
| Tailwind CSS | ^3.4.17 | Style utilitaire |
| Prisma | ^6.1.0 | ORM |
| PostgreSQL (Neon) | — | Base de données prod (SQLite possible en local, voir README) |
| `web-push` | ^3.6.7 | Notifications Web Push (VAPID) |
| `sharp` | ^0.34.5 | Traitement d'images (scripts d'optim, génération de logo) |
| `libphonenumber-js` + `country-flag-icons` | — | Validation téléphone international |
| `qrcode` + `pdfkit` | — | Génération des QR codes établissement (affiche A4) |
| Vercel | — | Hébergement + déploiement continu |

Synchro client ↔ staff par **polling** (4 s), pas de WebSocket. PWA installable avec **3 manifests séparés** (client / staff / admin — voir §6.3).

---

## 3. Système de design

### 3.1 Couleurs

Défini dans `tailwind.config.ts`. Thème **clair** ("façon La Merguez").

| Token | Valeur | Usage |
|---|---|---|
| `brand.DEFAULT` | `#e8730c` | Orange chaud — boutons principaux, onglet actif, accents |
| `brand.dark` | `#c25e08` | Variante hover/pressed |
| `gold.DEFAULT` | `#b45309` | Ambre profond — texte de prix (lisible sur fond clair) |
| `gold.dark` | `#92400e` | Variante |
| Fond de page | `#f1f3f7` | Gris très clair (`globals.css` body) |

**⚠️ Piège à connaître (identique sur La Merguez) : l'échelle `neutral` de Tailwind est INVERSÉE.**
Convention Tailwind standard : `neutral-50` = presque blanc, `neutral-950` = presque noir.
Ici c'est l'inverse — l'app a été migrée d'un thème sombre vers un thème clair en
**redéfinissant les valeurs de l'échelle** plutôt qu'en réécrivant toutes les classes :

| Plage | Rôle réel | Exemple |
|---|---|---|
| `neutral-50` → `neutral-500` | **Textes** (foncé → gris moyen) | `neutral-100 = #0f172a` (texte principal, bleu nuit) |
| `neutral-600` → `neutral-950` | **Fonds / bordures** (gris clair → blanc) | `neutral-900 = #ffffff` (cartes), `neutral-800 = #e9edf2` (champs) |

**Différence avec La Merguez : La Merguez fait exactement le même remapping mais sur l'échelle `stone`, pas `neutral`.** Donc les classes `bg-neutral-900` (Brooklyn) et `bg-stone-900` (La Merguez) sont les **mêmes valeurs visuelles**, mais un copier-coller de composant entre les deux projets sans adapter le nom de l'échelle casse tout silencieusement (aucune erreur de compilation, juste un mauvais rendu). **À vérifier systématiquement lors d'un portage de composant entre les deux projets.**

### 3.2 Typographie

- **Titres (h1/h2/h3, classe `.font-display`)** : **Playfair Display** (Google Font, `next/font/google`, poids 600/700), chargée dans `layout.tsx`, exposée en variable CSS `--font-display`. Look "éditorial / menu de restaurant".
- **Corps de texte** : police système par défaut (pas de police custom).
- **Logo texte** (image, pas du texte HTML) : **Baloo 2** (rounded/bubbly), voir §8.14 — utilisée uniquement pour reconstruire le wordmark "BROOKLYN FOOD" dans le fichier logo, pas dans l'UI.

### 3.3 Conventions UI

- Coins arrondis généreux : `rounded-xl`/`rounded-2xl` (cartes, champs), `rounded-3xl` (bottom sheets, logo).
- Bottom sheets mobiles : animation `sheet-up` (translateY), plein écran → modale centrée sur desktop (`animate-modal-in`).
- Anneau de focus visible au clavier : `outline: 2px solid #e8730c` (accessibilité).
- Respect de `prefers-reduced-motion`.
- Feedback tactile : `active:scale-[0.97]` / `active:scale-[0.98]` sur les boutons, pas de flash gris au tap (`-webkit-tap-highlight-color: transparent`).
- Animation `pop` sur le badge panier à l'ajout d'un article.
- **Animation "vol vers le panier"** (`flyToCart.ts`) : à l'ajout d'un plat, une pastille part du bouton et file en arc vers l'icône panier de la nav — pattern e-commerce classique (Amazon, Zalando), respecte `prefers-reduced-motion`.

### 3.4 Logo / branding

Voir bug majeur **§8.14** pour l'histoire complète (fichier source Higgsfield sans vraie transparence). Fichiers actuels dans `public/` : `logo.png` (badge complet, fond sombre `#111111`) et `icon-app.png` (icône carrée seule, même fond). Sources et déclinaisons dans `branding/`.

---

## 4. Fonctionnalités — par rôle

### 4.1 Client
- **Écran de démarrage (splash)** : logo affiché plein écran sur fond sombre à chaque ouverture/rafraîchissement de l'app (~1,3 s puis fondu), pour un ressenti "application" dès le lancement. `SplashScreen.tsx`, actif partout sauf `/staff`/`/admin`.
- Choix sur place / à emporter (actuellement : **à emporter uniquement** pour Brooklyn ; le mode livraison existe dans le code — voir §4.4).
- Menu par catégories, plats avec **étiquettes** (Végé / Épicé / Nouveau / Populaire), options tarifées (suppléments) et groupes de choix (sauce, viande, accompagnement…), `min`/`max` configurables (obligatoire / limite de sélection).
- Étape d'identification (`CheckoutForm`) avant envoi : prénom + téléphone pour un client, nom/table pour une saisie comptoir (téléphone facultatif), adresse + téléphone pour le mode livraison (latent, non activé).
- Fiche produit (`ItemSheet`) :
  - Image qui **défile avec le contenu puis disparaît au swipe** vers le haut (mobile) ; **colonne fixe carrée** à gauche sur desktop (bug de zoom corrigé, voir §8.10).
  - **Bouton "Ajouter" épinglé en bas**, toujours visible (affiche "Choix obligatoires manquants" tant que la sélection requise n'est pas complète).
  - Bouton fermer flottant (revenir au menu sans valider).
  - Verrouillage du défilement de la page derrière la fiche (anti "scroll chaining").
- Panier : miniatures produit (avec icône de repli si pas de photo), suggestions d'ajout rapide, note libre par ligne, **swipe vers le bas pour fermer** (comme les sites e-commerce).
- Validation du **numéro de téléphone international** (sélecteur pays + drapeaux).
- Suivi de commande temps réel (`/suivi/[token]`, lien non devinable) avec heure de retrait estimée et notification à la mise à disposition.
- Page **"Mes commandes"** (historique local, `localStorage`) qui se rafraîchit automatiquement tant qu'une commande est active.
- **PWA installable** avec assistant d'installation (`InstallPrompt`) : **mobile uniquement** (Android/iOS), masqué si déjà installé.
- Trilingue **FR / NL / EN**, sélecteur dans la nav.
- Anti-spam (par numéro de téléphone + IP), **prix toujours recalculés côté serveur** (jamais confiance au client).

### 4.2 Staff (`/staff`, protégé par `STAFF_PASSWORD`)
- Tableau de bord temps réel (polling 4 s, **continue même en arrière-plan** — c'est un écran de cuisine, voir §8.2).
- **Alerte sonore en boucle** à l'arrivée d'une commande : se répète jusqu'à ce que le staff touche l'écran (acquittement) ou après 45 s (coupure de sécurité). Voir §8.9 pour la limite iOS associée. **Bannière visible** si l'audio n'est pas confirmé débloqué (§8.20).
- **Tentative de maintien de l'écran allumé** (Wake Lock API + filet vidéo muette en boucle) — **best-effort seulement**, non fiable sur iOS récent (§8.21). Le réglage `Verrouillage automatique → Jamais` sur l'appareil reste la seule solution garantie.
- **Notification push** (écran verrouillé / app fermée) en complément du son — voir §6.
- Acceptation rapide (10/15/20/30 min ou temps personnalisé), refus avec motif, annulation de statut.
- Impression de ticket (`printTicket.ts`).
- Saisie de commande au comptoir (`/staff/nouvelle-commande`, téléphone facultatif) — **marquée explicitement `staffEntry: true`** pour ne pas fausser la détection client/staff (voir bug critique §8.5).
- Gestion de la disponibilité des plats (`/staff/menu`) : rupture de stock temporaire, sans toucher au menu source.
- Historique filtré + **export CSV** (`/staff/historique`).
- Sélecteur d'établissement (`StaffKitchenSelect`, cookie `staff_location`) — prêt pour le multi-établissement.

### 4.3 Admin (`/admin`, protégé par `ADMIN_PASSWORD`, accès aussi à `/staff`)
- **Barre de navigation dédiée** (4 boutons) : Dashboard · Dispo · Prix · Horaires — remplace la barre client qui menait à une impasse de navigation (voir §8.12).
- **Tableau de bord des ventes** : raccourcis de période (aujourd'hui/hier/7j/30j/mois…) ou plage via calendrier, KPI (CA, reçues, validées, en attente, refusées, panier moyen), liste des commandes de la période (clic = détail), suppression définitive (modale de confirmation). CA compté sur commandes validées uniquement, calcul à l'heure de Bruxelles.
- **Disponibilité des plats** (`/admin/menu`) — même fonction que côté staff.
- **Prix éditables** (`/admin/prices`) — surcharge en base du prix de base des plats **et** des suppléments/choix tarifés. Les groupes de choix **partagés** (sauce, viande…) sont listés **une seule fois** dans une section commune (bug de duplication corrigé, voir §8.11) — modifier "Andalouse" une fois la change partout où elle est proposée.
- **Horaires éditables** (`/admin/hours`) — un créneau ouverture/fermeture par jour, bascule Ouvert/Fermé. Layout responsive (bug de débordement mobile corrigé, voir §8.13). L'application réelle du blocage hors-horaires est pilotée par la variable d'env `ENFORCE_HOURS` (désactivée par défaut pour les tests).
- Endpoint de diagnostic push (`/api/push/test`) réservé admin — voir §6.4.

### 4.4 Transverse
- **i18n** : FR/NL/EN, cookie `locale`, dictionnaire unique `src/i18n/messages.ts` (mêmes clés dans les 3 langues). Les libellés de commande sont figés en FR à l'enregistrement puis **re-traduits à l'affichage** selon la langue du lecteur.
- **PWA multi-app** : trois manifests distincts (client/staff/admin), chacun avec son propre `start_url` mais un `scope` commun — voir §6.3 pour l'histoire complète (c'est le point le plus subtil du projet).
- **Sécurité** : jetons aléatoires non devinables pour le suivi, mots de passe pour staff/admin, prix recalculés serveur, export CSV protégé contre l'injection de formules.
- **Multi-établissement latent** : le code supporte plusieurs établissements et même le mode **livraison** (`checkDeliveryZone`, `geocode.ts`, autocomplétion d'adresse) — **non activé** pour Brooklyn (`modes: ["takeaway"]` dans `data/config.json`) mais prêt à l'emploi si le client en a besoin un jour.

---

## 5. Modèle de données (Prisma)

| Modèle | Rôle |
|---|---|
| `Order` | La commande : établissement, mode, client, items (JSON), total, statut (`pending/accepted/refused/ready`), source (`client`/`staff`) |
| `DisabledItem` | Plat temporairement indisponible, par établissement |
| `PriceOverride` | Prix surchargé d'un plat/supplément/choix, par établissement (clé composite `groupId:choiceId` pour les choix — voir §8.7 pour pourquoi) |
| `HoursOverride` | Horaires surchargés d'un établissement (JSON), remplace `data/config.json` si présent |
| `PushSubscription` | Abonnement Web Push (staff ou client), avec purge auto si expiré (410/404) |

Le **menu** (`data/menu.json`) et la **config** (`data/config.json`) restent des fichiers statiques versionnés — seules les *surcharges* (prix, horaires, disponibilité) vivent en base, éditables sans redéploiement.

---

## 6. PWA & notifications — le sujet le plus délicat du projet

Cette section résume l'essentiel ; le détail complet (checklist de déploiement, boîte à outils de diagnostic, tous les pièges) est dans **[`docs/NOTIFICATIONS-PUSH.md`](NOTIFICATIONS-PUSH.md)** — à lire avant de configurer un nouveau client.

### 6.1 Architecture
Deux canaux complémentaires : le **son in-page** (fiable seulement app ouverte au premier plan) et le **push système** (fiable même app fermée/écran verrouillé, mais son iOS non personnalisable — voir §8.9).

### 6.2 Détection commande client vs staff
Le push staff ne se déclenche QUE pour `order.source === "client"`. La détection exige **cookie staff ET drapeau `staffEntry: true`** — jamais le cookie seul (voir bug critique §8.5, celui qui a fait perdre le plus de temps).

### 6.3 Manifests séparés par rôle
`public/manifest.webmanifest` (client, `start_url:"/"`), `public/staff.webmanifest` (`start_url:"/staff"`), `public/admin.webmanifest` (`start_url:"/admin"`) — tous avec `scope:"/"`. Chaque section (`src/app/staff/layout.tsx`, `src/app/admin/layout.tsx`) surcharge `metadata.manifest`. **La convention de fichier `app/manifest.ts` a été supprimée** car elle forçait le même lien `<link rel="manifest">` sur toutes les pages, écrasant ces surcharges.

### 6.4 Diagnostic
Endpoint `/api/push/test` (POST `{location}`, cookie staff/admin) renvoie le statut d'envoi réel par appareil depuis le serveur de production — le réflexe n°1 en cas de souci.

---

## 7. Structure des dossiers

```
data/menu.json          ← menu (textes { fr, nl, en } ou chaîne simple)
data/config.json        ← nom, établissements, horaires par défaut, temps d'attente
prisma/schema.prisma    ← modèle de données (voir §5)
src/app/                ← pages (App Router) + routes API
  ├─ admin/             ← dashboard, prices, hours, menu (dispo), login
  ├─ staff/             ← board, menu (dispo), nouvelle-commande, historique, login
  ├─ commander/, contact/, mes-commandes/, suivi/[token]/
  └─ api/               ← orders, admin/*, staff/login, push/*, availability, geocode
src/components/         ← composants UI (voir liste §2 du code, ~27 fichiers)
src/lib/                ← logique serveur (menu, config, pricing, order, push, notify…)
src/i18n/               ← dictionnaire messages.ts (3 langues), cookie, helpers
src/store/              ← panier (par établissement) + historique local
branding/               ← fichiers logo sources et déclinaisons
docs/                   ← cette documentation + NOTIFICATIONS-PUSH.md
public/                 ← logo.png, icon-app.png, 3 manifests, sw.js (service worker)
```

---

## 8. Historique des bugs majeurs rencontrés et résolus

> Chaque entrée : symptôme → cause racine → correctif → fichier(s) concerné(s).
> Utile pour vérifier si un projet frère (La Merguez, futurs clients) souffre du même problème.

### 8.1 — Installation PWA proposée sur PC
**Symptôme** : le bandeau d'installation s'affichait aussi sur PC (Chrome desktop déclenche aussi `beforeinstallprompt`).
**Correctif** : détection de l'UA (Android/iOS uniquement) + masqué si déjà en mode standalone. `src/components/InstallPrompt.tsx`.

### 8.2 — Polling staff qui s'arrêtait en arrière-plan
**Symptôme** : le son ne se déclenchait pas si l'onglet staff n'était pas au premier plan.
**Cause** : `if (document.hidden) return;` dans la boucle de polling.
**Correctif** : suppression du garde — un écran de cuisine doit continuer d'interroger en arrière-plan. `src/components/StaffBoard.tsx`.

### 8.3 — Envoi du push non fiable sur Vercel serverless
**Cause** : `after(() => notifyStaffNewOrder(...))` peut ne jamais s'exécuter si la fonction serverless se gèle après la réponse.
**Correctif** : `await notifyStaffNewOrder(...)` avant de répondre (les erreurs restent avalées, ne bloquent pas la commande). `src/app/api/orders/route.ts`.

### 8.4 — Fausse piste : clés VAPID "vides"
**Symptôme apparent** : `vercel env pull` affichait `VAPID_PRIVATE_KEY=""`.
**Cause réelle** : `vercel env pull` **ne déchiffre aucune variable chiffrée** dans cet environnement (`DATABASE_URL` et `STAFF_PASSWORD`, pourtant fonctionnels, ressortaient aussi vides). **Piège d'outillage, pas un bug applicatif.**
**Leçon** : ne jamais diagnostiquer un secret via `vercel env pull` ; utiliser un endpoint de diagnostic serveur (§6.4) ou grep le bundle JS de prod pour une variable `NEXT_PUBLIC_*`.

### 8.5 — 🔴 LE bug critique : notification push jamais envoyée sur les vraies commandes
**Symptôme** : un test manuel du serveur fonctionnait (push livré), mais **aucune vraie commande** ne déclenchait de notification.
**Cause racine** : `isStaffOrder` était déterminé par la seule présence du **cookie** staff. Or le restaurateur teste ses commandes **depuis le navigateur où il est connecté à `/staff`** → chaque commande de test était taguée `source="staff"` → le push (qui ne se déclenche que pour `source="client"`) était systématiquement sauté.
**Correctif** : exiger **cookie ET drapeau explicite `staffEntry: true`** (envoyé uniquement par `/staff/nouvelle-commande`). `src/app/api/orders/route.ts` + `src/components/OrderFlow.tsx`.
**⚠️ À vérifier en priorité sur tout projet frère** : si les notifs semblent "aléatoires", c'est probablement ce bug.

### 8.6 — Crash iOS Safari → la PWA retombe en mode navigateur
**Symptôme** : bandeau iOS "cette page a été rechargée", puis barres Safari visibles (PWA qui perd son mode plein écran).
**Cause** : `alertNewOrder()` créait un `AudioContext` **par bip** (5 répétitions × 3 tons = 15 instances) — iOS Safari limite le nombre d'`AudioContext` simultanés (~4) et **plante la page** au-delà.
**Correctif** : un **seul `AudioContext` partagé**, réutilisé pour tous les bips (seuls des `OscillatorNode`, illimités, sont créés à chaque bip). `src/lib/notify.ts`.

### 8.7 — La PWA ne se lance jamais en plein écran (même sans crash)
**Cause** : Next.js 15's `appleWebApp.capable` n'émet que `<meta name="mobile-web-app-capable">` (ignoré par iOS), pas la version préfixée Apple qu'iOS exige réellement.
**Correctif** : ajout **explicite** de `<meta name="apple-mobile-web-app-capable" content="yes">` dans le `<head>`. `src/app/layout.tsx`.

### 8.8 — La PWA bascule en Safari **juste après** la connexion (pas avant)
**Symptôme** : l'écran de login restait en plein écran, mais basculait en barres Safari juste après avoir validé le mot de passe.
**Cause** : manifest sans `scope` explicite → iOS ancre le périmètre de l'app sur l'URL **après redirection** au lancement (`/admin` → `/admin/login` via le middleware d'auth) ; après connexion, la navigation vers `/admin` (hors de ce périmètre supposé) est jugée "hors app".
**Correctif** : `scope: "/"` (+ `id: "/"`) explicite dans le manifest — tout le site reste dans l'app quelles que soient les redirections. Voir aussi §8.16 pour le problème connexe des manifests multiples.

### 8.9 — Le son de notification reste le son iOS par défaut
**Ce n'est PAS un bug** mais une **limite de la plateforme** : iOS interdit un son personnalisé sur une notification Web Push en arrière-plan (réservé aux apps natives avec autorisation spéciale). Le seul endroit où le son est personnalisable est l'app **au premier plan**.
**Solution retenue** : `startAlarm()`/`stopAlarm()` — alarme forte à deux tons qui **boucle** jusqu'à ce que le staff touche l'écran (acquittement) ou 45 s (sécurité). `src/lib/notify.ts` + `src/components/StaffBoard.tsx`.
**Recommandation opérationnelle** : appareil dédié en cuisine, PWA ouverte en plein écran, verrouillage auto désactivé, volume au max.

### 8.10 — Image produit "zoomée" sur desktop (fiches à beaucoup d'options)
**Cause** : colonne image en `self-stretch` + `h-full` → forcée de remplir toute la hauteur de la fiche (qui grandit avec le nombre d'options) ; `object-cover` zoomait alors énormément pour combler cette hauteur excessive.
**Correctif** : `self-start` + `aspect-square` (taille fixe, indépendante du contenu) — pattern déjà correct sur La Merguez, juste reporté ici. `src/components/ItemSheet.tsx`.

### 8.11 — Sauces "dupliquées" dans l'éditeur de prix admin
**Cause** : 33 plats référencent le même groupe de choix partagé "sauce" (26 sauces) — l'écran de prix listait ce groupe complet **sous chaque plat** qui le propose.
**Correctif** : les groupes partagés sont désormais résolus **une seule fois** par `getMenu()` (nouveau champ `Menu.sharedChoiceGroups`), affichés dans une section commune unique, et filtrés des listes par plat. `src/lib/menu.ts`, `src/lib/pricing.ts`, `src/components/PriceManager.tsx`.

### 8.12 — Impasse de navigation dans l'admin
**Symptôme** : depuis `/admin`, taper sur un lien de la barre client (héritée par défaut) ou sur "Écran cuisine" empêchait de revenir au tableau de bord sans fermer/rouvrir l'app.
**Correctif** : barre de navigation **dédiée** à l'admin (Dashboard/Dispo/Prix/Horaires), bouton "Écran cuisine" retiré. `src/components/AdminNav.tsx`, `src/components/AppShell.tsx`, `src/components/AdminDashboard.tsx`.

### 8.13 — Horaires admin : débordement sur mobile
**Cause** : ligne unique (jour + statut + 2 champs horaire) trop large pour un petit écran, champ de fermeture coupé.
**Correctif** : layout responsive deux lignes sur mobile (jour+statut / plage horaire), champs en `flex-1` pour ne jamais déborder. `src/components/HoursManager.tsx`.

### 8.14 — Logo client sans vraie transparence (fichier Higgsfield)
**Symptôme** : le PNG fourni par le client (généré via Higgsfield) semblait avoir un fond transparent (damier visible) mais s'affichait avec un damier gris **opaque** une fois intégré.
**Cause** : le fichier n'avait **aucun canal alpha** — le damier de transparence était littéralement peint dans les pixels (image aplatie à l'export). Pire : le texte blanc "BROOKLYN" avait une couleur quasi identique à ce damier, rendant tout détourage par couleur (chroma-key) impossible sans perdre le texte.
**Tentatives infructueuses** : détection d'alternance locale, modélisation globale de la périodicité du damier — toujours des artefacts (damier résiduel visible, trous dans les lettres).
**Solution retenue** : détourage IA (suppression d'arrière-plan) pour l'**icône seule** (couleurs franches, a parfaitement fonctionné) + **reconstruction du texte** avec une vraie police (Baloo 2, rendue via SVG) plutôt que des pixels dégradés, recomposés sur un badge sombre. Couleur du "FOOD" reprise exactement de l'original (`#2484F0`) pour cohérence de marque.
**Leçon pour les prochains clients** : toujours vérifier `hasAlpha`/`channels` d'un PNG "transparent" fourni par un outil IA avant de l'utiliser (`sharp(...).metadata()`) — l'aperçu visuel d'un damier ne garantit pas une vraie transparence.

### 8.15 — Accueil montrant un sélecteur d'établissement pour un mono-établissement
**Correctif** : portage du mode `single` de La Merguez dans `LocationChooser` — bouton "Commander" + badge "Ouvert maintenant" au lieu d'une grille de choix. `src/components/LocationChooser.tsx`, `src/app/page.tsx`.

### 8.16 — Toutes les PWA installées ouvraient le site client
**Cause** : un seul manifest (`start_url:"/"`) pour toute l'app — impossible d'avoir une icône "Staff" qui ouvre `/staff`.
**Correctif** : 3 manifests séparés (§6.3). **Piège associé** : la convention `app/manifest.ts` de Next.js forçait le même lien sur toutes les pages, écrasant les surcharges par layout — il a fallu la supprimer et passer par des fichiers statiques dans `public/`.

### 8.17 — Horaires évalués en UTC au lieu de l'heure de Bruxelles
**Symptôme** : à l'ouverture réelle (ex. 17h à Bruxelles), l'app affichait encore "fermé".
**Cause** : le serveur Vercel tourne en **UTC** ; comparer "17:00" (config) à l'heure serveur brute décale l'ouverture de 1-2h selon la saison.
**Correctif** : calcul du jour + de l'heure via `Intl.DateTimeFormat` avec `timeZone: "Europe/Brussels"`, gère aussi les créneaux qui passent minuit. `src/lib/config.ts` (fonction `zonedNow`). *(Antérieur à cette session — retrouvé en auditant l'historique git complet, voir §10.)*

### 8.18 — Connexion admin bloquée par son propre garde de sécurité
**Symptôme** : impossible de se connecter à `/admin` — erreur "Non autorisé" en boucle.
**Cause** : le middleware protégeait `/api/admin/*` **avant** d'exclure `/api/admin/login` de cette protection — la route de connexion elle-même exigeait d'être déjà connecté.
**Correctif** : `/api/admin/login` et `/api/staff/login` explicitement exclus du filtre, en plus des pages `/admin/login`/`/staff/login`. `src/middleware.ts`. *(Antérieur à cette session.)*

### 8.19 — Suivi client gelé après un changement de statut par le staff
**Symptôme** : si le staff revenait sur une décision (ex. re-basculait une commande "prête" vers "acceptée", ou corrigeait un refus), le client bloqué sur `/suivi/[token]` ne voyait jamais le changement.
**Cause** : `OrderTracker` **arrêtait son polling** dès que le statut atteignait `ready` ou `refused`, jugés "terminaux" — alors que le staff peut les modifier après coup.
**Correctif** : polling permanent, sans condition d'arrêt sur le statut. `src/components/OrderTracker.tsx`. *(Antérieur à cette session.)*

### 8.20 — Alarme silencieuse malgré l'app ouverte au premier plan
**Symptôme** : commande visible à l'écran (le polling fonctionne), mais **aucun son** de l'alarme staff — juste le bip système iOS de la notification push.
**Cause** : `AudioContext.resume()` appelé **hors d'un geste utilisateur direct** (ex. depuis l'alarme déclenchée par le polling en arrière-plan) peut échouer **silencieusement** sur iOS Safari — le contexte reste `suspended`, sans la moindre erreur, sans son, même app ouverte. Le déblocage au premier tap (mécanisme déjà en place) ne suffit pas s'il n'a jamais eu lieu depuis le dernier chargement de la page.
**Correctif** : `isAudioUnlocked()` expose l'état réel du contexte (`src/lib/notify.ts`) ; une **bannière visible** s'affiche sur l'écran staff tant qu'il n'est pas confirmé actif, avec un bouton **« Activer le son »** (un vrai clic garantit un déblocage fiable). Le déblocage est aussi retenté à **chaque** interaction (pas seulement la première). `src/components/StaffBoard.tsx`.
**Leçon pour tout projet frère** : ne jamais supposer qu'un `resume()` a réussi silencieusement — toujours vérifier `ctx.state === "running"` et le rendre visible côté UI en cas d'échec.

### 8.21 — ⚠️ Aucun contournement web ne garantit un écran qui ne se verrouille jamais (iOS)
**Symptôme** : l'écran se verrouille automatiquement après quelques secondes malgré `navigator.wakeLock.request("screen")` **et** le filet de sécurité vidéo (muette, en boucle, technique NoSleep.js) — les deux ajoutés côté code, les deux sans effet en test réel sur iPhone. Mode Économie d'énergie vérifié **désactivé** (n'explique donc pas l'échec).
**Cause probable** : sur les versions récentes d'iOS, Apple a **durci le système contre ces contournements** (raisons de sécurité/batterie) — une page web ne peut plus forcer l'écran à rester allumé de façon fiable. C'est une **limite plateforme**, pas un bug corrigible côté code.
**Code conservé quand même** (`src/components/StaffBoard.tsx`) : Wake Lock API + vidéo muette en boucle — best-effort, peuvent aider sur Android ou d'anciennes versions d'iOS, mais **ne pas en dépendre**.
**✅ La VRAIE solution, garantie, est un réglage sur l'appareil lui-même, pas dans le code :**
- **Réglages → Affichage et luminosité → Verrouillage automatique → Jamais**.
- Pour un vrai mode "borne" (empêche aussi de sortir de l'app par erreur) : **Réglages → Accessibilité → Accès guidé**, à activer puis démarrer (triple-clic bouton latéral) sur l'app staff. C'est la configuration standard des points de vente / écrans de cuisine dédiés.
**Leçon pour tout projet frère** : ne jamais promettre qu'un Wake Lock (API ou technique vidéo) empêchera le verrouillage de façon fiable sur iOS — toujours recommander le réglage `Verrouillage automatique → Jamais` (+ Accès guidé) comme solution **principale**, le code n'étant qu'un filet best-effort secondaire.

### 8.22 — 🔴 `.env` local désynchronisé de la prod → `prisma db push` sur la mauvaise base

**Symptôme** : après un ajout de modèle Prisma, le site tombe en erreur serveur (`PrismaClientKnownRequestError: The table ... does not exist in the current database`) alors que le schéma a bien été poussé et que le déploiement a réussi.

**Cause** : le `DATABASE_URL` du `.env` local pointait vers une base Neon différente de celle réellement utilisée en production sur Vercel. Comme la base de données s'appelle toujours `neondb` quel que soit le projet, rien ne le signale à l'œil — il faut comparer l'hôte (`ep-xxxxxxxx`), pas juste le nom de la base. `npx prisma db push` a alors créé les nouvelles tables sur une base fantôme, jamais utilisée par le site réel.

**Correctif** : retrouver la vraie base de prod via Neon (`mcp__plugin_neon_neon__list_projects` + `get_connection_string`, à comparer avec le projet Vercel du client), relancer `prisma db push` avec le bon `DATABASE_URL`, puis vérifier via `get_runtime_errors` (Vercel) que le site répond de nouveau.

**Leçon pour tout projet frère** : **avant tout `prisma db push`/`migrate` sur un projet client, vérifier que le `.env` local correspond à la vraie base de production** — ne jamais supposer que `.env` est à jour, une base peut avoir été recréée/reprovisionnée sans que `.env` suive. Procédure complète et table de correspondance client → projet Neon à tenir à jour dans `C:\Users\thoub\.claude\RESTAURANT-APPS-SYSTEM.md` §4bis (chaque nouveau client doit y être ajouté dès sa création, voir Étape 2 du runbook). Après toute modification de schéma en prod, vérifier immédiatement les logs d'erreur runtime plutôt que d'attendre qu'un client tombe sur une page blanche.

### Pièges d'outillage (non liés au code, mais à connaître)
- `vercel env pull` ne déchiffre rien dans cet environnement (§8.4) — inutile pour vérifier un secret.
- `"valeur" | vercel env add ...` **échoue silencieusement en PowerShell** (stdin mal transmis) — toujours utiliser Bash avec `printf '%s' "valeur" | vercel env add ...`.
- **Une édition sur un fichier de route dynamique (chemin contenant `[id]`) peut échouer silencieusement** selon l'outil utilisé — un ajout de code sur `api/orders/[id]/route.ts` n'avait pas été appliqué du premier coup lors d'une session antérieure (la notification client "prêt" manquait sans erreur visible). **Toujours relire le fichier après une édition sur un chemin entre crochets pour confirmer que le changement est bien présent.**

---

## 9. Checklist de comparaison entre projets

À dérouler sur La Merguez Du Chef (ou tout nouveau projet issu du même template) pour savoir ce qui doit être mis à jour :

- [ ] **Notifications push** : `staffEntry` bien exigé en plus du cookie (§8.5) ? Push envoyé en `await` et non `after()` (§8.3) ? Polling qui continue en arrière-plan (§8.2) ?
- [ ] **PWA plein écran** : `apple-mobile-web-app-capable` présent explicitement (§8.7) ? `scope` défini dans le(s) manifest(s) (§8.8) ? Manifests séparés si plusieurs rôles (staff/admin) ont besoin d'ouvrir des pages différentes (§8.16) ?
- [ ] **Son iOS** : `notify.ts` utilise-t-il un `AudioContext` **partagé** (pas un par bip, §8.6) ? Alarme en boucle avec acquittement présente (§8.9) ?
- [ ] **ItemSheet** : image en `aspect-square`/`self-start` et non `h-full`/`self-stretch` (§8.10) ?
- [ ] **Prix éditables (si présents)** : les groupes de choix partagés sont-ils dédupliqués (§8.11) ?
- [ ] **Navigation admin** : existe-t-il un chemin de retour vers le dashboard depuis chaque écran admin (§8.12) ?
- [ ] **Design system** : quelle échelle Tailwind est remappée (`neutral` ici, `stone` sur La Merguez) — vérifier avant tout copier-coller de composant (§3.1) ?
- [ ] **Logo** : le fichier source a-t-il une vraie transparence (`sharp(...).metadata().hasAlpha`) avant intégration (§8.14) ?
- [ ] **Mono vs multi-établissement** : `LocationChooser` en mode `single` si un seul établissement (§8.15) ?
- [ ] **Horaires** : `ENFORCE_HOURS` correctement positionné selon l'environnement (test vs prod) ?
- [ ] **Variables d'environnement** : toutes vérifiées via un endpoint de diagnostic serveur, jamais via `vercel env pull` (§8.4) ?
- [ ] **Horaires** : évalués avec `Intl.DateTimeFormat(..., { timeZone: "Europe/Brussels" })` et non l'heure serveur brute (UTC sur Vercel, §8.17) ?
- [ ] **Middleware d'auth** : les routes `/api/*/login` sont-elles bien exclues du filtre qu'elles servent elles-mêmes à satisfaire (§8.18) ?
- [ ] **Suivi client** (`OrderTracker` ou équivalent) : le polling continue-t-il **sans condition d'arrêt sur le statut** (§8.19) ?
- [ ] **Alarme staff** : une bannière signale-t-elle visiblement si l'audio n'est pas confirmé débloqué (`isAudioUnlocked`, §8.20), plutôt que de supposer un `resume()` silencieusement réussi ?
- [ ] **Écran toujours allumé** (borne, cuisine) : a-t-on bien recommandé au client le réglage `Verrouillage automatique → Jamais` (+ Accès guidé) sur l'appareil — et pas seulement compté sur le Wake Lock/la vidéo côté code, non fiables sur iOS (§8.21) ?

---

## 10. Méthode de vérification de cette documentation

**Comment être sûr que rien n'a été oublié ?** Ne pas se fier à la mémoire de la conversation seule — elle ne couvre que les bugs *vus en direct* pendant une session. La méthode fiable : **confronter le document à l'historique git**, qui est la seule source objective et complète de "ce qui a été corrigé".

Commande utilisée pour cet audit (à relancer périodiquement, ou après une longue session de travail) :
```bash
git log --oneline --reverse | cat
```
Puis, pour chaque commit dont le message contient `fix`, `bug`, ou décrit un comportement corrigé mais qui **ne trouve pas d'écho dans la section 8** de ce document, inspecter le detail avec :
```bash
git show <hash>          # message complet + diff
```
Cette méthode a été appliquée le 2026-07-01 sur l'historique complet (`262ab5b` → `92f8591`, ~50 commits) : elle a révélé **3 bugs antérieurs à la session en cours** qui manquaient (§8.17, §8.18, §8.19) et **1 piège d'outillage** (édition silencieusement échouée sur un chemin `[id]`), maintenant intégrés ci-dessus.

**Limites à connaître** :
- Cette méthode retrouve les bugs **corrigés dans le code versionné**. Un bug corrigé en base de données uniquement (ex. une donnée erronée nettoyée manuellement) ou un réglage changé directement sur Vercel sans commit ne laisse aucune trace ici.
- Un commit au message vague (ex. juste "fix") demande une lecture du diff pour comprendre s'il mérite une entrée détaillée — c'est un travail manuel, pas automatisable à 100 %.
- La section **Fonctionnalités** (§4) a été vérifiée différemment : en lisant l'arborescence réelle du code (`src/app`, `src/components`, `src/lib`) plutôt que l'historique — donc à jour avec l'état actuel, indépendamment des commits.

**Pour re-vérifier toi-même à tout moment** : lance la commande `git log` ci-dessus, compare visuellement chaque ligne à la section 8, et demande d'creuser tout commit qui ne semble pas couvert.
