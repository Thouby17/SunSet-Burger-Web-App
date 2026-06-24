# SunSet Burger — commande à distance

Web app de commande à distance pour un restaurant. **Aucun paiement en ligne** :
le client paie sur place / à la récupération. La commande transmet les choix au
restaurant, qui accepte (avec un temps d'attente estimé) ou refuse.

> 🆕 Pour **dupliquer ce projet pour un autre restaurant**, suis la checklist
> [`NOUVEAU-CLIENT.md`](NOUVEAU-CLIENT.md).

## Stack
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL** (Neon) en production · **SQLite** possible en local
- Synchro client ↔ staff par **polling**
- **PWA** installable (écran d'accueil, plein écran) + **assistant d'installation**
- **Trilingue** : FR · NL (Belgique) · EN (client *et* staff)

## Structure
```
data/menu.json        ← le menu (textes en { "fr", "nl", "en" })
data/config.json      ← nom, horaires, contact, temps d'attente par défaut
src/i18n/             ← langues : dictionnaire (messages.ts), cookie, helpers
prisma/schema.prisma  ← modèle Order
src/app/              ← pages (accueil, /commander, /suivi/[token], /staff, /contact) + API
src/components/       ← composants UI (dont LangSwitcher, InstallPrompt)
src/lib/              ← menu, config, db, logique commande, formats
src/store/            ← panier + "mes commandes" (localStorage)
public/logo.png       ← logo (accueil) · public/icon-app.png ← icône d'app (favicon/iOS/PWA)
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
> pour tester librement en journée, élargis les créneaux du jour.
> Scripts utiles : `npm run db:clear` (vide les commandes), `npm run db:studio`.

## Modifier le menu / les horaires
Édite `data/menu.json` et `data/config.json`, puis rafraîchis la page.

**Textes multilingues** : nom, description, libellés de catégories et de choix
acceptent soit une chaîne simple (identique partout), soit un objet par langue :
```json
"label": { "fr": "Sauce", "nl": "Saus", "en": "Sauce" }
```

Pour chaque plat :
- `options` : suppléments tarifés (cases à cocher).
- `choiceGroups` / `choiceGroupRefs` : groupes de choix (sauce, taille, pièces…).
  `min`/`max` bornent la sélection (`max:1` = boutons radio ; `min>=1` = obligatoire).
  `choiceGroupRefs` réutilise un groupe partagé défini dans `sharedChoiceGroups`.

## Langues (i18n)
- Les textes d'interface vivent dans `src/i18n/messages.ts` (3 langues, mêmes clés).
- La langue est mémorisée dans un **cookie** (`locale`), lisible serveur + client ;
  le sélecteur **FR / NL / EN** est dans la barre du bas (client) et l'écran staff.
- Les libellés des commandes (figés en FR à l'enregistrement) sont **ré-affichés
  dans la langue du lecteur** côté client et staff.

## Marque / logo
- Couleur d'accent : `tailwind.config.ts` (`brand.DEFAULT` / `brand.dark`) — se
  propage partout via les classes `bg-brand` / `text-brand`.
- `public/logo.png` (accueil) et `public/icon-app.png` (favicon, icône iOS, PWA).
- Noms / titres : `src/app/manifest.ts`, `src/app/layout.tsx`, `package.json`.

## Déployer (Vercel + Neon, gratuit)
Résumé (détails et réglages dans [`NOUVEAU-CLIENT.md`](NOUVEAU-CLIENT.md)) :
1. Pousser le repo sur GitHub.
2. Importer le repo sur **Vercel** + variable `STAFF_PASSWORD`.
3. Brancher une base **Neon** (onglet Storage → Neon ; **Auth OFF**, prefix `DATABASE`).
4. Créer les tables : `npm run db:push` avec l'URL Neon **directe** dans `.env`.
5. Redéployer.

> ⚠️ Le plan **Vercel Hobby (gratuit) est non commercial**. Pour un restaurant en
> activité, prévoir **Vercel Pro** ou une alternative (Cloudflare, Railway, Render).

## Pages
- **/** accueil · **/commander** parcours client (mobile-first)
- **/suivi/[token]** suivi d'une commande (auto-rafraîchi)
- **/mes-commandes** historique mémorisé sur l'appareil du client
- **/contact** coordonnées + horaires
- **/staff** écran du personnel (desktop) · **/staff/historique** (filtres + export CSV)

## Fonctionnalités incluses
- **Client** : sur place / à emporter, menu + options tarifées, panier (note libre),
  validation du **n° mobile belge**, suivi temps réel avec **heure de retrait estimée**
  et **notification quand c'est prêt**, page « Mes commandes ».
- **Staff** : protégé par mot de passe, temps réel avec **son + badge**, **temps écoulé
  + alerte** sur les commandes qui traînent, acceptation rapide (10/15/20/30 min),
  refus avec motif, **annulation** d'un statut (anti-missclick), historique + **export CSV**.
- **Trilingue** FR/NL/EN (client + staff) · **PWA** installable avec assistant d'installation.
- Anti-spam (par numéro / IP), prix **recalculés côté serveur**.

## Sécurité
- Suivi client via **jeton aléatoire** (`/suivi/[token]`) — pas d'énumération possible.
- Écran staff + API sensibles protégés par `STAFF_PASSWORD` (anti-brute-force au login).
- Prix recalculés serveur, validation du n° belge, export CSV protégé contre l'injection de formules.

## À prévoir avant la vraie mise en service
- **Mot de passe `STAFF_PASSWORD` fort** (différent de `dev-local`).
- **Plan d'hébergement** adapté à un usage commercial (voir Déployer).
- Anti-spam **en mémoire** (best-effort sur serverless) → pour du robuste, brancher
  un store partagé **Upstash Redis** (remplacer `src/lib/rateLimit.ts`).
- SMS OTP si une vraie vérification du numéro devient nécessaire.
