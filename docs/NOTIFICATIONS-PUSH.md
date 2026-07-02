# 🔔 Notifications staff (son + push) — Guide & checklist nouveau client

> **But de ce document :** éviter de reperdre des heures sur les notifications quand
> on déploie un nouveau restaurant à partir de ce template. Lis la **checklist**
> (section 1), garde la **boîte à outils de diagnostic** (section 4) sous la main,
> et consulte la **liste des pièges** (section 5) au moindre souci.

---

## 0. Comment ça marche (architecture)

Deux canaux complémentaires alertent le staff d'une **nouvelle commande client** :

| Canal | Quand | Fiabilité | Fichiers clés |
|---|---|---|---|
| **Son in-page** | Onglet `/staff` ouvert | ⚠️ coupé/bridé par le navigateur si l'onglet est en **arrière-plan** | `StaffBoard.tsx` (polling 4 s) + `notify.ts` (Web Audio) |
| **Push système** | App fermée, écran verrouillé, onglet caché | ✅ **le seul canal fiable hors focus** | `pushClient.ts`, `push.ts`, `public/sw.js`, `api/push/subscribe`, `AlertsControl.tsx` |

Flux complet d'une commande :
```
Client passe commande (/commander)
  -> POST /api/orders   (source = "client")
       -> order.create()
       -> await notifyStaffNewOrder(location.id, payload)   // push.ts
            -> prisma.pushSubscription.findMany({ role:"staff", location })
            -> webpush.sendNotification() vers chaque appareil abonné
                 -> service push (Apple/Windows/Google)
                      -> sw.js "push" event -> showNotification() + postMessage
StaffBoard (onglet ouvert) reçoit le postMessage -> alertNewOrder() (son immédiat)
StaffBoard (onglet ouvert) détecte aussi via polling 4 s -> alertNewOrder()
```

**Point crucial :** le push ne part **que** pour `order.source === "client"`. Une
commande saisie au comptoir (`/staff/nouvelle-commande`) est `source === "staff"`
et ne notifie volontairement personne.

---

## 1. ✅ Checklist déploiement nouveau client

### A. Générer une paire de clés VAPID **propre à ce client**
```bash
npx web-push generate-vapid-keys
```
Garde les deux clés (publique + privée). **Ne réutilise jamais** les clés d'un autre
client — chaque restaurant a sa propre paire.

### B. Renseigner les variables sur **Vercel** (Production)
Il faut **4 variables**, toutes non vides :

| Variable | Valeur |
|---|---|
| `VAPID_PUBLIC_KEY` | la clé publique générée |
| `VAPID_PRIVATE_KEY` | la clé privée générée |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **identique** à la clé publique (injectée dans le build client) |
| `VAPID_SUBJECT` | `mailto:contact@<domaine-du-client>` (Apple **exige** un sujet valide) |

⚠️ **Utilise Bash, pas PowerShell** (voir piège §5.2) :
```bash
printf '%s' "BPubKey..." | vercel env add VAPID_PUBLIC_KEY production
printf '%s' "PrivKey..." | vercel env add VAPID_PRIVATE_KEY production
printf '%s' "BPubKey..." | vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
printf '%s' "mailto:contact@client.be" | vercel env add VAPID_SUBJECT production
```
Mets aussi `DATABASE_URL`, `STAFF_PASSWORD`, `ADMIN_PASSWORD`.

### C. Redéployer (obligatoire après tout changement d'env)
```bash
vercel --prod --yes
```
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` est figée **au build** : sans redéploiement, le client
s'abonne avec l'ancienne clé.

### D. Vérifier que la clé publique est bien dans le build
```bash
# remplace <TAIL> par les 6 derniers caractères de la clé publique
curl -s https://<projet>.vercel.app/suivi/test \
  | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u \
  | while read c; do curl -s "https://<projet>.vercel.app$c" | grep -q "<DEBUT_CLE>" && echo "OK: $c"; done
```

### E. Test de bout en bout
1. Sur **PC** : ouvrir `/staff`, cliquer **« Activer les alertes »** -> bouton vert.
2. Sur **téléphone** : voir §3 (iOS a des contraintes).
3. Lancer le diagnostic serveur (section 4.1) -> doit renvoyer `status:201` par appareil.
4. Passer une **vraie commande client** depuis `/commander` (pas la page staff !)
   -> notif « 🍔 Nouvelle commande #… » sur tous les appareils abonnés.

---

## 2. ⚙️ Logique « commande staff vs client » (NE PAS CASSER)

C'est **le** bug qui nous a coûté le plus de temps. Le push ne part que si
`order.source === "client"`. La détection doit exiger **deux** conditions :

```ts
// api/orders/route.ts
const hasStaffCookie = /* cookie staff_auth ou admin_auth valide */;
const isStaffOrder = hasStaffCookie && body.staffEntry === true;  // ⚠️ LES DEUX
```
```ts
// OrderFlow.tsx — dans le POST /api/orders
staffEntry: staff,   // `staff` prop = true UNIQUEMENT sur /staff/nouvelle-commande
```

**Pourquoi les deux ?** Le restaurateur teste ses commandes depuis le **même
navigateur** où il est connecté à `/staff`. Si on se base sur le seul cookie, **toutes**
ses commandes test sont taguées `staff` -> push jamais envoyé -> "ça ne marche pas".
Le drapeau `staffEntry` n'est mis qu'au comptoir, donc une commande client reste
`client` même depuis un navigateur staff.

---

## 3. 🍎 Spécificités iOS (iPhone/iPad)

- **iOS 16.4+ obligatoire.**
- Le push ne marche **QUE** si l'app est **installée sur l'écran d'accueil** (PWA).
  Dans un onglet Safari classique : pas de push possible (`AlertsControl` affiche
  alors « installez l'app »).
- Lancer l'app **depuis l'icône de l'écran d'accueil**, pas depuis Safari.
- Autoriser : **Réglages iOS -> <app> -> Notifications -> Autoriser**.
- Apple est **strict sur `VAPID_SUBJECT`** : un sujet manquant/invalide fait
  rejeter le push (alors que Windows/Android l'ignorent). Symptôme typique :
  **PC reçoit, iPhone non.**
- Si on réinstalle la PWA, l'ancien abonnement devient orphelin : se réabonner
  via « Activer les alertes » dans la PWA réinstallée.

---

## 4. 🧰 Boîte à outils de diagnostic

### 4.1 Endpoint de test serveur (le plus utile)
`POST /api/push/test` (réservé staff) envoie une notif de test à tous les appareils
staff d'un établissement **depuis le serveur de production** et renvoie un diagnostic :
```bash
curl -s -X POST "https://<projet>.vercel.app/api/push/test" \
  -H "Content-Type: application/json" \
  -H "Cookie: staff_auth=<STAFF_PASSWORD>" \
  -d '{"location":"<locationId>"}'
```
Réponse :
```json
{ "configured": true, "subject": "mailto:contact@client.be", "publicTail": "bMsRFg",
  "total": 2, "sent": 2, "failed": 0,
  "results": [ {"kind":"APPLE","status":201,"ok":true}, ... ] }
```
Lecture :
- `configured:false` -> clés VAPID absentes côté serveur.
- `total:0` -> aucun appareil abonné (cliquer « Activer les alertes »).
- `403/400` sur **APPLE** seulement -> `VAPID_SUBJECT` ou clé invalide.
- `410/404` -> abonnement expiré (purgé automatiquement).
- `status:201` partout mais rien à l'écran -> problème **appareil** (iOS PWA, réglages).

### 4.2 Lister les abonnements stockés
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const s=await p.pushSubscription.findMany();console.log(s.length);for(const x of s)console.log(x.id,x.role,x.location,x.endpoint.slice(0,50));await p.\$disconnect();})()"
```

### 4.3 Vérifier le `source` des commandes récentes (diag du bug §2)
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const o=await p.order.findMany({orderBy:{createdAt:'desc'},take:6,select:{id:true,source:true,location:true}});console.log(o);await p.\$disconnect();})()"
```
Si toutes les commandes test sont `source=staff` -> c'est le bug §2.

### 4.4 Envoyer un push de test en local (vérifie clés + abonnement)
```bash
node -e "require('dotenv').config();const w=require('web-push');const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();w.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);(async()=>{for(const s of await p.pushSubscription.findMany()){try{const r=await w.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'Test',body:'OK'}));console.log(s.id,'OK',r.statusCode)}catch(e){console.log(s.id,'FAIL',e.statusCode)}}await p.\$disconnect();})()"
```

---

## 5. ⚠️ Pièges rencontrés (et leurs solutions)

### 5.1 `vercel env pull` n'affiche PAS les valeurs chiffrées
Dans cet environnement, `vercel env pull` ressort **toutes** les variables chiffrées
à `""` (vide), y compris `DATABASE_URL` qui fonctionne pourtant. **Ne conclus jamais
« la variable est vide » à partir d'un pull.** Pour vérifier une `NEXT_PUBLIC_*` :
grep dans le bundle JS de production (§1.D). Pour les secrets serveur : utilise
l'endpoint de test (§4.1) qui tourne sur le serveur.

### 5.2 `vercel env add` échoue silencieusement en **PowerShell**
Le piping PowerShell `"valeur" | vercel env add ...` ne transmet pas correctement
stdin -> la variable est créée **vide**. **Toujours utiliser l'outil Bash :**
`printf '%s' "valeur" | vercel env add NAME production`.

### 5.3 Son in-page inaudible en arrière-plan
Les navigateurs **brident/coupent l'audio d'un onglet non focalisé**. Le son du
polling n'est donc PAS fiable si l'onglet staff n'est pas au premier plan. -> Le
**push** est le canal de référence. Ne pas confondre « son du polling au retour
sur l'onglet » avec « push reçu ».

### 5.4 Polling qui s'arrête en arrière-plan
`StaffBoard.tsx` ne doit **pas** faire `if (document.hidden) return;` dans le timer :
c'est un écran de cuisine, il doit continuer à interroger même en arrière-plan.

### 5.5 `after()` vs `await` pour l'envoi du push
Sur Vercel serverless, `after(() => notifyStaffNewOrder(...))` peut ne jamais
s'exécuter (la fonction gèle après la réponse). -> Utiliser
`await notifyStaffNewOrder(...)` dans `POST /api/orders` (les erreurs sont
quand même avalées par `.catch(() => {})`, ça ne bloque pas la commande).

### 5.7 La PWA staff plante sur iPhone (barres Safari + bandeau "rechargée")
Symptôme : la PWA installée (`/staff`) affiche les barres Safari et le bandeau
**« Cette page web a été rechargée car un problème est survenu »**. Ce bandeau =
message iOS de **crash WebKit** ; après un crash, iOS rebascule en vue navigateur.
Cause : iOS Safari **limite le nombre d'`AudioContext`** (~4) et crashe au-delà.
`alertNewOrder` créait un `AudioContext` PAR bip (5×3 = 15) -> crash.
Solution (dans `notify.ts`) : **un seul `AudioContext` partagé**, réutilisé pour
tous les bips ; chaque bip ne crée que des `OscillatorNode` (illimités). Ne jamais
faire `new AudioContext()` à chaque bip, ni `ctx.close()` sur le contexte partagé.
Après ce fix : fermer complètement l'app et la relancer depuis l'icône de l'écran
d'accueil pour retrouver le plein écran (mode app).

### 5.8 La PWA s'ouvre comme une page web (barres Safari + zoom possible)
Symptôme : l'app installée affiche la barre d'URL + la barre d'outils Safari, et
le pinch-zoom marche -> ce n'est PAS du standalone.
Cause : avec Next.js 15, `appleWebApp: { capable: true }` n'émet que
`<meta name="mobile-web-app-capable">` (ignoré par iOS), **pas** la balise préfixée
Apple. iOS a besoin de `<meta name="apple-mobile-web-app-capable" content="yes">`.
Solution : ajouter la balise **explicitement** dans le `<head>` du `layout.tsx`
(ne pas se fier au seul `appleWebApp`). Vérifier en prod :
```bash
curl -s https://<projet>.vercel.app/ | grep -o 'apple-mobile-web-app-capable[^>]*'
```
Optionnel (ressenti app) : `viewport` avec `maximumScale: 1, userScalable: false`
pour bloquer le zoom.
⚠️ **iOS met en cache la capacité standalone AU MOMENT de l'ajout à l'écran
d'accueil.** Une icône ajoutée AVANT le fix reste une simple page web pour
toujours : il FAUT **supprimer l'icône et la réinstaller** depuis Safari.

### 5.9 La PWA bascule en Safari APRÈS le login (pas avant)
Symptôme : l'écran de connexion est en plein écran (mode app), mais **juste après
avoir validé le mot de passe**, les barres Safari apparaissent (avec un bouton "X"
en haut = navigateur in-app iOS).
Cause : le manifest n'a **pas de `scope` explicite**. Au lancement, `/admin` (ou
`/staff`) fait une **redirection 307 vers `/admin/login`** (middleware d'auth).
Sans `scope`, iOS ancre le périmètre de l'app sur l'URL FINALE après redirection
(`/admin/login`). Après login, la navigation vers `/admin` (un niveau au-dessus)
est jugée **hors app** -> ouverte dans le navigateur in-app.
Solution : déclarer `scope: "/"` (et `id: "/"`) dans `manifest.ts`. Tout le site
reste alors dans l'app, quelles que soient les redirections d'auth.
⚠️ Comme pour §5.8, iOS met le scope en cache à l'ajout -> **supprimer et
réinstaller** l'icône après le déploiement.

### 5.10 Installer 3 apps distinctes (client / staff / admin) sur l'écran d'accueil
Besoin : la PWA installée depuis `/staff` doit s'ouvrir sur l'écran cuisine, celle
depuis `/admin` sur le dashboard, et le client sur `/`. Avec UN seul manifest
(`start_url:"/"`), **toutes** les installations ouvrent le site client.
Solution = **un manifest par rôle** :
- `public/manifest.webmanifest` (client) : `start_url:"/"`.
- `public/staff.webmanifest` : `start_url:"/staff"`, `name:"Brooklyn Staff"`.
- `public/admin.webmanifest` : `start_url:"/admin"`, `name:"Brooklyn Admin"`.
- **Tous** avec `scope:"/"` (sinon les liens croisés staff↔admin↔client éjectent
  en navigateur, cf. §5.9).
Chaque section pointe son manifest via un `layout.tsx` :
`export const metadata = { manifest: "/staff.webmanifest", appleWebApp: { capable:true, title:"Brooklyn Staff", statusBarStyle:"default" } }`.
⚠️ **Piège Next.js** : la convention `app/manifest.ts` force `<link rel="manifest">`
sur TOUTES les pages et **écrase** le `metadata.manifest` des layouts. Il faut
**supprimer `app/manifest.ts`** et servir les manifests en **fichiers statiques**
dans `public/`, puis déclarer `manifest:"/manifest.webmanifest"` dans le layout
racine. Vérifier en prod : `curl .../staff/login | grep 'rel="manifest"'`.
⚠️ iOS met le manifest en cache à l'ajout -> **réinstaller** les icônes.

### 5.6 Tous les fichiers push sont identiques au template
`notify.ts`, `pushClient.ts`, `push.ts`, `AlertsControl.tsx`, `public/sw.js`,
`api/push/subscribe` sont **byte-identiques** au template (La Merguez). Si le push
déconne sur un nouveau client, **ne perds pas de temps à diffuser ces fichiers** :
regarde d'abord la **config Vercel** (§1) et la **logique du `source`** (§2).

---

## 6. Récap de l'incident Brooklyn Food (30/06/2026)

Symptôme : aucune notif son/push, ni PC ni téléphone. Causes trouvées et corrigées,
dans l'ordre :
1. `StaffBoard` arrêtait le polling en arrière-plan (`document.hidden`) -> retiré.
2. Push envoyé via `after()` -> passé en `await`.
3. **Cause principale :** commandes test taguées `source="staff"` car la détection
   se basait sur le seul cookie staff. -> ajout du drapeau `staffEntry` (§2).
4. Ajout de `/api/push/test` (§4.1) pour diagnostiquer depuis la production.

Les clés VAPID, elles, étaient **bonnes** (le diag renvoyait `201` vers Apple) —
elles avaient juste été un faux coupable au départ à cause du piège §5.1.
