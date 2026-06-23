# Brooklyn Food — commande à distance

Web app de commande à distance pour un restaurant unique. **Aucun paiement en
ligne** : le client paie sur place / à la récupération. La commande transmet les
choix au restaurant, qui accepte (avec un temps d'attente) ou refuse.

## Stack
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **SQLite** (local) → **Postgres / Neon** (production)
- Synchro client ↔ staff par **polling**

## Structure
```
data/menu.json      ← le menu (édite-le librement, pas besoin de toucher au code)
data/config.json    ← nom du resto, horaires d'ouverture, temps d'attente par défaut
prisma/schema.prisma← modèle Order
src/app/            ← pages (accueil, /commander, /suivi/[id], /staff) + API
src/components/     ← composants UI
src/lib/            ← menu, config, db, logique commande, formats
src/store/cart.ts   ← panier client (localStorage)
```

## Lancer en local
```bash
npm install
npx prisma db push     # crée la base SQLite (prisma/dev.db)
npm run dev            # http://localhost:3000
```

> L'accès `/staff` est protégé par mot de passe (variable `STAFF_PASSWORD` dans
> `.env`, valeur par défaut `brooklyn` — **à changer**).

Pages :
- **/** accueil
- **/commander** parcours client (mobile-first)
- **/suivi/[id]** suivi d'une commande (auto-rafraîchi)
- **/staff** écran du personnel (desktop)

> Les commandes sont bloquées hors horaires d'ouverture (`data/config.json`).
> Pour tester librement, élargis les créneaux du jour.

## Modifier le menu / les horaires
Édite `data/menu.json` et `data/config.json`, puis rafraîchis la page.

Pour chaque plat :
- `options` : **suppléments tarifés** (cases à cocher, ex. `+1 € cheddar`).
- `choiceGroups` : **groupes de choix** (sauce, viande, accompagnement, taille…).
  - `min`/`max` bornent le nombre de sélections (`max:1` = boutons radio ;
    `max>1` = cases ; `min>=1` = obligatoire). `price` à `0` = gratuit.

Exemple de groupe de choix :
```json
"choiceGroups": [
  {
    "id": "sauce", "label": "Sauce", "min": 1, "max": 1,
    "choices": [
      { "id": "andalouse", "label": "Andalouse", "price": 0 },
      { "id": "samourai", "label": "Samouraï", "price": 0 }
    ]
  }
]
```

## Déployer (Vercel + Neon, gratuit)
1. Crée une base Postgres gratuite sur [Neon](https://neon.tech) → copie l'URL de connexion.
2. Dans `prisma/schema.prisma`, mets `provider = "postgresql"`.
3. Sur Vercel : importe le repo, ajoute les variables d'env `DATABASE_URL` (URL Neon)
   et `STAFF_PASSWORD` (mot de passe d'accès à l'écran staff).
4. Applique le schéma à la base de prod :
   ```bash
   # en local, avec DATABASE_URL pointant sur Neon :
   npx prisma db push
   ```
5. Déploie. Le `build` lance `prisma generate` automatiquement.

> Alternative SQLite + disque persistant : Railway (~5 $/mois). Voir `prisma/schema.prisma`.

## Fonctionnalités incluses
- Client : choix sur place / à emporter, menu + suppléments tarifés, panier
  (note libre), **validation du n° mobile belge**, suivi temps réel avec
  **heure de retrait estimée** et **notification quand c'est prêt**, page
  **« Mes commandes »** (`/mes-commandes`) — historique mémorisé dans le
  navigateur du client, sans stockage supplémentaire côté restaurant.
- Staff : protégé par mot de passe, temps réel avec **son + badge** à chaque
  nouvelle commande, **temps écoulé + alerte** sur les commandes qui traînent,
  acceptation rapide (boutons 10/15/20/30 min), refus avec confirmation,
  **annulation** d'un statut (anti-missclick).
- Historique `/staff/historique` : filtre par dates, totaux (nb commandes + CA),
  **export CSV**. L'écran live ne montre que le jour pour rester rapide.
- Anti-spam : limite de commandes par numéro / IP.

## Sécurité
- Suivi client via **jeton aléatoire** (`/suivi/[token]`) — pas d'énumération
  possible des commandes / coordonnées clients.
- Écran staff + API sensibles protégés par mot de passe (`STAFF_PASSWORD`),
  avec **anti-brute-force** sur la connexion.
- Prix recalculés côté serveur, validation du n° belge, anti-spam, export CSV
  protégé contre l'injection de formules.

## À prévoir avant la vraie mise en service
- **Changer `STAFF_PASSWORD`** (mot de passe fort).
- Anti-spam **en mémoire** (best-effort sur serverless multi-instances) → pour du
  robuste, brancher un store partagé **Upstash Redis** (remplacer `src/lib/rateLimit.ts`
  par des appels `@upstash/ratelimit` ; mêmes points d'appel dans les routes).
- SMS OTP si une vraie vérification du numéro devient nécessaire.
