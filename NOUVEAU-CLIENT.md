# 🍔 Mise en route — nouveau client (restaurant)

Ce projet est un **template** de web app de commande à distance (Next.js + Prisma
+ Postgres/Neon, déployé sur Vercel, **sans paiement en ligne**). Cette checklist
sert à le dupliquer rapidement pour un nouveau restaurant.

> Principe : **1 client = 1 copie + 1 repo GitHub + 1 base Neon + 1 projet Vercel.**
> Tout tient dans les offres gratuites (Neon : jusqu'à 100 projets ; Vercel : plusieurs projets).

---

## 0. Ce qu'il faut récupérer auprès du client
- [ ] **Menu** complet : catégories, plats, prix, options (sauces, tailles, suppléments, nb de pièces…)
- [ ] **Nom** du resto, **slogan**
- [ ] **Horaires** (par jour), **adresse**, **téléphone**, **email**
- [ ] **Logo** — idéalement un vrai **PNG** (voir piège logo plus bas) + couleur dominante
- [ ] **Langues** voulues (FR / NL / EN)

---

## 1. Copier le template proprement
Dans **PowerShell** (remplace `NomResto`) :

```powershell
robocopy "C:\Users\thoub\SunSet-Burger-Web-App" "C:\Users\thoub\NomResto-Web-App" /E /XD .git node_modules .next /XF .env "dev.db"
```

Copie tout **sauf** l'historique git, les dépendances, les secrets et la base locale.

Puis, dans le nouveau dossier :
```powershell
cd C:\Users\thoub\NomResto-Web-App
npm install
```

## 2. Nouvelle session Claude Code dans ce dossier
- **App bureau** : ouvrir le dossier `NomResto-Web-App` → nouvelle conversation.
- **Terminal** : `cd` dans le dossier puis `claude`.

Chaque dossier a sa **propre mémoire** → aucun mélange entre clients.

## 3. Brief de départ à coller dans la nouvelle session
```
Ce projet est une copie d'un template de commande à distance pour restaurant.
Lis README.md, CLAUDE.md et NOUVEAU-CLIENT.md. Les données (data/menu.json,
data/config.json) et le logo (public/) sont encore ceux de l'ancien client —
remplace-les par mon nouveau client : [NOM].
Fais comme documenté : 1) menu + config  2) marque (couleur, logo, icônes, noms)
3) trilingue FR/NL/EN  4) base Neon + déploiement Vercel + STAFF_PASSWORD
5) assistant d'installation PWA.
```

---

## 4. Les fichiers à personnaliser (ce que Claude modifie)
| Quoi | Fichier(s) |
|---|---|
| Menu | `data/menu.json` (textes en `{ "fr": ..., "nl": ..., "en": ... }`) |
| Nom, horaires, contact, slogan | `data/config.json` |
| Couleur de marque | `tailwind.config.ts` (`brand.DEFAULT` / `brand.dark`) |
| Logo accueil | `public/logo.png` |
| Icône d'app (favicon/iOS/PWA) | `public/icon-app.png` (emblème recadré du logo) |
| Noms / titres | `src/app/manifest.ts`, `src/app/layout.tsx`, `package.json` |
| Clés localStorage | `src/store/cart.ts`, `src/store/myOrders.ts` |
| Traductions interface | `src/i18n/messages.ts` |

> La couleur `brand` se propage **automatiquement** partout (classes Tailwind `bg-brand`, `text-brand`).

---

## 5. Tester en local (base SQLite, hors-ligne)
Le schéma est en **PostgreSQL** pour la prod. Pour tester en local sans base cloud :
1. `prisma/schema.prisma` → `provider = "sqlite"`
2. `.env` → `DATABASE_URL="file:./dev.db"` et `STAFF_PASSWORD="dev-local"`
3. `npm run db:push` (crée la base) puis `npm run dev`
4. ⚠️ **Avant de déployer, remettre `provider = "postgresql"`**.

Utilitaires : `npm run db:clear` (vide les commandes), `/staff` (mot de passe = `STAFF_PASSWORD`).
> Les commandes sont **bloquées hors horaires** : pour tester en journée, élargir temporairement les créneaux dans `data/config.json`.

---

## 6. Déploiement Neon + Vercel
1. **GitHub** : créer un repo et y pousser le projet (`git init`, commit, `git remote add origin …`, `git push`).
2. **Vercel** : `vercel.com/new` → importer le repo → ajouter la variable
   `STAFF_PASSWORD` (générer un mot de passe fort) → **Deploy**.
3. **Base Neon** (intégration) : projet Vercel → onglet **Storage** → **Create Database → Neon** :
   - Plan **Free**, région **Frankfurt**
   - ⚠️ **Auth → OFF** (on n'en a pas besoin)
   - ⚠️ **Custom Prefix → `DATABASE`** (pour obtenir la variable `DATABASE_URL`)
4. **Créer la table** : copier l'URL Neon **directe** (sans `-pooler`) dans le `.env`
   local, puis `npm run db:push`.
5. **Redéployer** sur Vercel (Deployments → ⋯ → Redeploy) pour prendre la base en compte.
6. Tester l'URL `…vercel.app` (accueil, commande, `/staff`).

---

## 7. Pièges rencontrés (à connaître)
- **Logo en WebP déguisé en .png** : si le fichier est un WebP renommé, l'icône iOS casse.
  Convertir en vrai PNG : `node -e "require('sharp')('public/logo.png').png().toFile('public/logo_real.png')"` puis remplacer.
- **Icône d'app** : recadrer l'emblème **central** du logo (sans le texte du contour, illisible en petit) :
  `node -e "require('sharp')('public/logo.png').extract({left:300,top:298,width:424,height:424}).resize(1024,1024).png().toFile('public/icon-app.png')"`
  (ajuster `left/top/width` selon le logo). Vérifier en ouvrant le PNG.
- **iOS met l'icône en cache** : si déjà ajoutée à l'écran d'accueil, la retirer puis la rajouter.
- **`.env` local ↔ base de prod** : si le `.env` pointe vers la base Neon de prod, les
  tests locaux écrivent en prod. Pour isoler → créer une **branche Neon de dev**.

---

## 8. Avant l'ouverture commerciale
- [ ] ⚠️ **Plan Vercel** : le plan gratuit (Hobby) est **non commercial**. Un resto =
      usage commercial → prévoir **Vercel Pro (20 $/mois)** ou une alternative
      (Cloudflare gratuit / Railway ~5 $ / Render ~7 $). Code portable.
- [ ] **Domaine** : un `.be` (~6–15 €/an) est plus naturel qu'un sous-domaine `.vercel.app`.
      L'acheter chez un registrar puis le brancher dans Vercel (Settings → Domains).
- [ ] **STAFF_PASSWORD** fort en prod (différent de `dev-local`).
- [ ] **QR code** imprimable vers l'URL finale (tables, vitrine, Instagram) — à générer
      une fois le domaine choisi pour ne pas réimprimer.

---

## 9. Fonctionnalités déjà incluses dans le template
- Parcours client mobile (sur place / à emporter, menu + options, panier, suivi temps réel, « Mes commandes »)
- Écran staff protégé par mot de passe (temps réel, son, acceptation/refus, historique + export CSV)
- **Trilingue FR / NL / EN** (client + staff), les commandes se ré-affichent dans la langue du lecteur
- **Assistant d'installation PWA** (bouton Android + guide iPhone)
- Validation n° mobile belge, anti-spam, prix recalculés côté serveur
