// Importe automatiquement les photos des plats depuis la page Uber Eats du
// restaurant, sans navigateur ni "inspecter l'élément".
//
// Usage :
//   node scripts/import-ubereats-photos.mjs "https://www.ubereats.com/be-en/store/<slug>/<idStore>?..."
//
// Ce que fait le script :
//   1. Décode l'identifiant du restaurant depuis l'URL (base64url -> UUID).
//   2. Interroge l'API interne d'Uber Eats (getStoreV1) pour obtenir tout le
//      catalogue d'un coup (nom, prix, photo de chaque plat).
//   3. Pour les plats sans photo dans le catalogue, tente l'API du détail
//      (getMenuItemV1) — certains n'ont réellement AUCUNE photo sur Uber Eats,
//      c'est signalé en fin d'exécution (à demander au restaurateur).
//   4. Fait correspondre chaque plat Uber Eats à un plat de data/menu.json
//      (comparaison des noms normalisés : accents/émojis/ponctuation ignorés).
//      Les cas ambigus ou introuvables sont listés, jamais devinés.
//   5. Télécharge chaque photo dans  menu-photos/<id-du-plat>.jpg .
//
// Étapes suivantes (inchangées) :
//   npm run images        -> optimise en WebP carré 1000px dans public/menu/
//   node scripts/link-menu-images.mjs  -> relie les photos dans data/menu.json
//
// ⚠️ Uber Eats peut faire évoluer son API interne sans préavis. Si le script
// échoue avec des 404/403 : vérifier l'URL, réessayer plus tard, ou repasser
// par un navigateur. Dernière validation : 2026-07-02 (client Sun Set Burger).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const storeUrl = process.argv[2];
if (!storeUrl) {
  console.error('Usage : node scripts/import-ubereats-photos.mjs "<URL de la page Uber Eats du resto>"');
  process.exit(1);
}

// ── 1. UUID du restaurant depuis l'URL ─────────────────────────────────────
const m = storeUrl.match(/\/store\/[^/]+\/([A-Za-z0-9_-]{22})/);
if (!m) {
  console.error("URL non reconnue : il faut une URL de la forme .../store/<slug>/<id de 22 caractères>");
  process.exit(1);
}
const b = Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/") + "==", "base64");
const h = b.toString("hex");
const storeUuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
console.log(`Restaurant : ${storeUuid}`);

// ── 2. Catalogue complet ───────────────────────────────────────────────────
async function api(endpoint, body) {
  const res = await fetch(`https://www.ubereats.com/_p/api/${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": "x",
      "user-agent": UA,
      origin: "https://www.ubereats.com",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  const j = await res.json();
  if (j.status !== "success") throw new Error(`${endpoint} -> ${JSON.stringify(j).slice(0, 200)}`);
  return j.data;
}

const store = await api("getStoreV1", { storeUuid, diningMode: "DELIVERY" });
console.log(`Page : ${store.title}`);

const ubItems = new Map(); // titre -> { title, image, uuid, sectionUuid, subsectionUuid }
for (const list of Object.values(store.catalogSectionsMap ?? {})) {
  for (const sec of list) {
    const p = sec?.payload?.standardItemsPayload;
    if (!p?.catalogItems) continue;
    for (const it of p.catalogItems) {
      const prev = ubItems.get(it.title);
      if (!prev || (!prev.image && it.imageUrl)) {
        ubItems.set(it.title, {
          title: it.title,
          image: it.imageUrl || null,
          uuid: it.uuid,
          sectionUuid: it.sectionUuid,
          subsectionUuid: it.subsectionUuid,
        });
      }
    }
  }
}
console.log(`${ubItems.size} plats trouvés sur Uber Eats.`);

// ── 3. Détail pour les plats sans photo dans le catalogue ──────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const it of [...ubItems.values()].filter((i) => !i.image)) {
  try {
    const d = await api("getMenuItemV1", {
      storeUuid,
      sectionUuid: it.sectionUuid,
      subsectionUuid: it.subsectionUuid,
      menuItemUuid: it.uuid,
      cbType: "EATER_ENDORSED",
    });
    const imgs = (d.images ?? [])
      .map((x) => (typeof x === "string" ? { url: x } : x))
      .filter((x) => x.url || x.imageUrl);
    imgs.sort((a, z) => (z.width ?? 0) - (a.width ?? 0));
    it.image = imgs[0]?.url ?? imgs[0]?.imageUrl ?? null;
  } catch {
    /* pas bloquant : le plat restera "sans photo" */
  }
  await sleep(200);
}

// ── 4. Correspondance avec data/menu.json ──────────────────────────────────
const norm = (t) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "") // émojis
    .replace(/[^a-z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const menu = JSON.parse(readFileSync("data/menu.json", "utf8"));
const menuItems = [];
for (const cat of menu.categories) {
  for (const it of cat.items) {
    const name = typeof it.name === "string" ? it.name : it.name.fr;
    menuItems.push({ id: it.id, name, n: norm(name), nid: norm(it.id.replace(/-/g, " ")) });
  }
}

function matchMenuId(ubTitle) {
  const t = norm(ubTitle);
  let hit = menuItems.filter((mi) => mi.n === t || mi.nid === t);
  if (hit.length === 1) return hit[0].id;
  // tolérance : le titre Uber contient le nom du plat, ou l'inverse
  hit = menuItems.filter((mi) => t.includes(mi.n) || mi.n.includes(t));
  if (hit.length === 1) return hit[0].id;
  return null; // introuvable ou ambigu -> signalé, jamais deviné
}

// ── 5. Téléchargement ──────────────────────────────────────────────────────
mkdirSync("menu-photos", { recursive: true });
let ok = 0;
const noPhoto = [];
const noMatch = [];
for (const it of ubItems.values()) {
  if (!it.image) {
    noPhoto.push(it.title);
    continue;
  }
  const id = matchMenuId(it.title);
  if (!id) {
    noMatch.push(it.title);
    continue;
  }
  const res = await fetch(it.image, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.log(`⚠️ HTTP ${res.status} : ${it.title}`);
    continue;
  }
  writeFileSync(`menu-photos/${id}.jpg`, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ menu-photos/${id}.jpg  <-  ${it.title}`);
  ok++;
}

console.log(`\n${ok} photo(s) téléchargée(s).`);
if (noMatch.length)
  console.log(`\n❓ ${noMatch.length} plat(s) Uber Eats sans correspondance dans data/menu.json (à traiter à la main) :\n  - ${noMatch.join("\n  - ")}`);
if (noPhoto.length)
  console.log(`\n∅ ${noPhoto.length} plat(s) SANS photo sur Uber Eats (à demander au restaurateur) :\n  - ${noPhoto.join("\n  - ")}`);
console.log(`\nÉtapes suivantes :\n  npm run images\n  node scripts/link-menu-images.mjs`);
