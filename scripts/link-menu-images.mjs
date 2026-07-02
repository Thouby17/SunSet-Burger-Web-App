// Relie automatiquement les photos optimisées (public/menu/<id>.webp) aux plats
// de data/menu.json : pour chaque plat dont l'image est absente/null, si un
// fichier public/menu/<id-du-plat>.webp existe, écrit "image": "/menu/<id>.webp".
// Re-exécutable sans risque après chaque `npm run images`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const menuPath = "data/menu.json";
const menu = JSON.parse(readFileSync(menuPath, "utf8"));
let linked = 0;
for (const cat of menu.categories) {
  for (const it of cat.items) {
    if (it.image) continue;
    if (existsSync(`public/menu/${it.id}.webp`)) {
      it.image = `/menu/${it.id}.webp`;
      linked++;
    }
  }
}
writeFileSync(menuPath, JSON.stringify(menu, null, 2) + "\n");
console.log(`${linked} plat(s) relié(s) à leur photo.`);
