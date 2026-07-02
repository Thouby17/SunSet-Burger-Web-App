# Restaurant App — Template

> 🧩 **Ceci est le TEMPLATE**, pas un projet client. Sert de point de départ pour
> chaque nouveau restaurant (clone → personnalisation → déploiement propre).
> Procédure complète et système multi-clients :
> `C:\Users\thoub\.claude\RESTAURANT-APPS-SYSTEM.md`.
> Ne jamais déployer CE dépôt tel quel pour un vrai client — toujours partir
> d'un clone dédié.

Web app de commande à distance pour un restaurant. **Aucun paiement en ligne** :
le client paie sur place / à la récupération. La commande transmet les choix au
restaurant, qui accepte (avec un temps d'attente estimé) ou refuse.

## Stack
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL** (Neon) en production · **SQLite** possible en local
- Synchro client ↔ staff par **polling**
- **PWA** installable (écran d'accueil, plein écran) + **assistant d'installation**
- **Trilingue** : FR · NL (Belgique) · EN (client *et* staff)
- **Multi-établissement** (option C) : une URL, le client choisit son établissement
  (ou via QR `…/?l=<id>`), commandes **isolées par cuisine**.

## Structure
```
data/menu.json        ← le menu (textes en { "fr", "nl", "en" } ou simple chaîne)
data/config.json      ← nom, établissements (adresse/tél/horaires), temps d'attente
src/i18n/             ← langues : dictionnaire (messages.ts), cookie, helpers
prisma/schema.prisma  ← modèle Order
src/app/              ← pages (accueil, /commander, /suivi/[token], /staff, /contact) + API
src/components/       ← composants UI (dont LangSwitcher, InstallPrompt, LocationChooser)
src/lib/              ← menu, config, db, logique commande, formats
src/store/            ← panier (par établissement) + "mes commandes" (localStorage)
public/logo.png, icon-app.png ← logo & icône · public/*.webmanifest ← 3 manifests (client/staff/admin)
```

## Lancer en local
Le schéma est en **PostgreSQL** pour la prod. Deux options en local :

**A) Base cloud (Neon)** — colle l'URL Neon dans `.env` (`DATABASE_URL=...`) puis :
```bash
npm install
npm run db:push     # crée les tables
npm run dev         # http://localhost:3000
```

**B) Base locale SQLite** (hors-ligne) :
1. `prisma/schema.prisma` → `provider = "sqlite"`
2. `.env` → `DATABASE_URL="file:./dev.db"` + `STAFF_PASSWORD="dev-local"`
3. `npm install && npm run db:push && npm run dev`
4. ⚠️ **Remettre `provider = "postgresql"` avant de déployer.**

> L'accès `/staff` est protégé par mot de passe (variable `STAFF_PASSWORD`).
> Les commandes sont **bloquées hors horaires d'ouverture** (`data/config.json`) ;
> pour tester librement, élargis les créneaux du jour.
> Scripts utiles : `npm run db:clear` (vide les commandes), `npm run db:studio`.

## Modifier le menu / les horaires / les établissements
Édite `data/menu.json` et `data/config.json`, puis rafraîchis la page.

**Établissements** : `config.json` → tableau `locations` (`id`, `name`, `phone`,
`email`, `address`, `hours`). Un seul par défaut (`principal`) ; en ajouter
revient à ajouter une entrée (et regénérer les QR). ⚠️ Si tu changes l'`id` du
1er établissement, mets aussi à jour le `@default(...)` du modèle `Order` dans
`prisma/schema.prisma`.

**Textes multilingues** : nom, description, libellés de catégories et de choix
acceptent soit une chaîne simple (identique partout), soit un objet par langue :
```json
"label": { "fr": "Sauce", "nl": "Saus", "en": "Sauce" }
```

Pour chaque plat :
- `options` : suppléments tarifés (cases à cocher).
- `choiceGroups` / `choiceGroupRefs` : groupes de choix (sauce, viande, taille…).
  `min`/`max` bornent la sélection (`max:1` = boutons radio ; `min>=1` = obligatoire).
  `choiceGroupRefs` réutilise un groupe partagé défini dans `sharedChoiceGroups`.

## Langues (i18n)
- Les textes d'interface vivent dans `src/i18n/messages.ts` (3 langues, mêmes clés).
- La langue est mémorisée dans un **cookie** (`locale`), lisible serveur + client ;
  le sélecteur **FR / NL / EN** est dans la barre du bas (mobile) et la barre du haut (desktop).
- Les libellés des commandes (figés en FR à l'enregistrement) sont **ré-affichés
  dans la langue du lecteur** côté client et staff.

## Marque / logo
- Couleur d'accent : `tailwind.config.ts` (`brand.DEFAULT` / `brand.dark`) — se
  propage partout via les classes `bg-brand` / `text-brand`. Titres en **Playfair
  Display** (`font-display`, voir `src/app/layout.tsx`).
- `public/logo.png` (accueil, splash, nav) et `public/icon-app.png` (favicon, icône
  PWA/maskable) — sources et déclinaisons dans `branding/`.
- Noms / titres : `public/*.webmanifest` (3 manifests, un par rôle — voir
  [`docs/PROJET-COMPLET.md`](docs/PROJET-COMPLET.md#6-pwa--notifications) §6.3),
  `src/app/layout.tsx`, `package.json`.

## QR codes (un par établissement)
Chaque établissement a un **lien profond** `…/?l=<id>` qui sélectionne
automatiquement le bon point de vente et redirige vers la commande.
⚠️ **`BASE_URL` est OBLIGATOIRE** (pas de valeur par défaut — un oubli
pointerait les QR codes d'un client vers le domaine d'un AUTRE client) :

```bash
BASE_URL=https://mon-domaine.be npm run qr        # PNG + SVG + affiche PDF (qr/)
BASE_URL=https://mon-domaine.be npm run qr:pdf    # uniquement l'affiche PDF
```

Sorties dans `qr/` : `qr-<id>.svg` / `qr-<id>.png` et une affiche PDF A4 prête à
imprimer. **Adapte l'URL par défaut du script (`scripts/generate-qr.mjs`) au
domaine réel du client**, ou passe-la à chaque exécution :
`BASE_URL=https://mon-domaine.be npm run qr`.

## Déployer (Vercel + Neon, gratuit)
1. Pousser le repo sur GitHub (déploiement auto à chaque push sur `main`).
2. Sur **Vercel** : variables `DATABASE_URL` (Neon), `STAFF_PASSWORD`, `ADMIN_PASSWORD`,
   et les clés **VAPID** (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) pour le Web Push.
3. Appliquer le schéma à la base : `npm run db:push` avec l'URL Neon **directe** dans `.env`.

> ⚠️ Le plan **Vercel Hobby (gratuit) est non commercial**. Pour un restaurant en
> activité, prévoir **Vercel Pro** ou une alternative (Cloudflare, Railway, Render).

> 🔔 **Notifications staff (son + push)** : la configuration VAPID, la checklist
> nouveau client, le diagnostic et tous les pièges sont documentés dans
> [`docs/NOTIFICATIONS-PUSH.md`](docs/NOTIFICATIONS-PUSH.md). **À lire avant de
> déployer un nouveau client** — ça évite de reperdre des heures sur les notifs.

> 📖 **Documentation complète du projet** (fonctionnalités détaillées, design
> system, modèle de données, et surtout l'historique de **tous** les bugs majeurs
> résolus avec leur cause racine) : [`docs/PROJET-COMPLET.md`](docs/PROJET-COMPLET.md).
> Le document de référence pour comparer avec les autres projets (La Merguez Du
> Chef, futurs clients) et savoir ce qui doit y être mis à jour.

## Pages
- **/** accueil · **/commander** parcours client (mobile-first)
- **/suivi/[token]** suivi d'une commande (auto-rafraîchi)
- **/mes-commandes** historique mémorisé sur l'appareil du client
- **/contact** coordonnées + horaires par établissement
- **/staff** écran du personnel (desktop) · **/staff/historique** (filtres + export CSV)
- **/staff/nouvelle-commande** saisie d'une commande au comptoir par le staff (tél. facultatif)
- **/staff/menu** activer/désactiver des plats (rupture de stock)
- **/admin** espace **gérant** : tableau de bord des ventes — raccourcis (aujourd'hui / hier /
  7 j / 30 j / ce mois / mois dernier / 12 mois) **ou plage de dates via calendrier**, KPI
  (CA, reçues, validées, en attente, refusées, panier moyen), liste des commandes de la période
  (**clic = détail**) + suppression — protégé par `ADMIN_PASSWORD`
- **/admin/menu** disponibilité des plats · **/admin/prices** prix des plats/suppléments éditables
  (groupes de choix partagés affichés une seule fois) · **/admin/hours** horaires d'ouverture éditables
  — navigation dédiée (barre du bas Dashboard/Dispo/Prix/Horaires)

## Variables d'environnement
| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion PostgreSQL/Neon |
| `STAFF_PASSWORD` | accès `/staff` (+ saisie comptoir, gestion menu) |
| `ADMIN_PASSWORD` | accès `/admin` (dashboard ventes + suppression). L'admin a aussi accès au staff |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | Web Push (notif écran verrouillé) |
| `ENFORCE_HOURS` | `true` = applique réellement les horaires (commandes refusées hors ouverture). Absent/`false` = **toujours ouvert** (tests). À mettre à `true` en production. |

## Fonctionnalités incluses
- **Client** : sur place / à emporter, menu + options tarifées, panier (note libre),
  validation du **n° mobile belge**, suivi temps réel avec **heure de retrait estimée**
  et **notification quand c'est prêt**, page « Mes commandes » **qui se met à jour toute seule**
  tant qu'une commande est en cours (acceptée → prête sans rafraîchir). **Panier indépendant
  par établissement**.
- **Staff** : protégé par mot de passe, temps réel avec **alarme sonore en boucle** (jusqu'à
  acquittement par un tap écran, coupure de sécurité 45 s — le son personnalisé iOS n'existe
  qu'app ouverte, voir doc complète) + vibration + badge, **temps écoulé + alerte**, acceptation
  rapide (10/15/20/30 min), refus avec motif, **annulation** d'un statut, **saisie de commande
  au comptoir** (tél. facultatif), **activation/désactivation de plats** (rupture), historique
  (filtré sur le jour) + **export CSV**.
- **Gérant (admin)** : tableau de bord des **ventes par période** (raccourcis + **calendrier**
  de dates, application immédiate), KPI **CA / reçues / validées / en attente / refusées /
  panier moyen**, **liste des commandes de la période** (clic → détail : articles, options) et
  **suppression définitive** (réservée à l'admin, **modale de confirmation**). Le **CA ne compte
  que les commandes validées** (acceptées/prêtes) ; une commande supprimée disparaît de la base
  et des stats. Calcul à l'heure de **Bruxelles**. **Prix et horaires éditables** sans redéploiement
  (surcharge en base, voir `/admin/prices` et `/admin/hours`).
- **Notifications push (écran verrouillé)** : staff alerté d'une nouvelle commande, client
  alerté de l'acceptation / mise à disposition, même app fermée (Web Push + service worker).
  *(iOS : nécessite la PWA installée, iOS 16.4+.)*
- **Trilingue** FR/NL/EN (client + staff) · **PWA** installable avec assistant d'installation.
- **QR codes** par établissement + affiche PDF A4 imprimable (`npm run qr`).
- Anti-spam (par numéro / IP), prix **recalculés côté serveur**.

## Sécurité
- Suivi client via **jeton aléatoire** (`/suivi/[token]`) — pas d'énumération possible.
- Écran staff + API sensibles protégés par `STAFF_PASSWORD` (anti-brute-force au login).
- Prix recalculés serveur, validation du n° belge, export CSV protégé contre l'injection de formules.

## À prévoir avant la vraie mise en service
- **Activer les horaires** : définir `ENFORCE_HOURS=true` sur Vercel pour que les
  commandes soient refusées hors ouverture (sinon le resto reste « toujours ouvert »).
- **Mots de passe `STAFF_PASSWORD` et `ADMIN_PASSWORD` forts** (différents de `dev-local`).
- **Plan d'hébergement** adapté à un usage commercial (voir Déployer).
- Anti-spam **en mémoire** (best-effort sur serverless) → pour du robuste, brancher
  un store partagé **Upstash Redis** (remplacer `src/lib/rateLimit.ts`).
- SMS OTP si une vraie vérification du numéro devient nécessaire.
