// Optimise les photos de plats pour le web.
//
// Workflow :
//   1. Dépose les images SOURCE (haute résolution, ex. téléchargées depuis Uber
//      Eats) dans le dossier  menu-photos/  à la racine (NON servi au public).
//      Nomme chaque fichier avec l'id du plat (data/menu.json), ex.
//      "sandwich-boeuf-chef.webp".
//   2. Lance :  npm run images
//   3. Les versions optimisées (carré 1000px, WebP qualité 80) sont écrites dans
//      public/menu/  et référencées dans le menu via "/menu/<id>.webp".
//
// Re-exécutable sans risque : régénère tout le dossier public/menu.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "menu-photos");
const OUT_DIR = path.join(ROOT, "public", "menu");

const SIZE = 1000; // côté du carré final (net même sur écran retina)
const QUALITY = 80; // bon compromis qualité / poids en WebP
const EXT = /\.(webp|jpe?g|png)$/i;

async function main() {
  let files;
  try {
    files = (await readdir(SRC_DIR)).filter((f) => EXT.test(f));
  } catch {
    console.error(`Dossier introuvable : ${SRC_DIR}\nCrée-le et dépose-y tes photos (1 fichier = id du plat).`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.log(`Aucune image dans ${SRC_DIR}. Rien à faire.`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const file of files) {
    const id = file.replace(EXT, "");
    const input = await readFile(path.join(SRC_DIR, file));
    const outPath = path.join(OUT_DIR, `${id}.webp`);
    await sharp(input)
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: QUALITY })
      .toFile(outPath);
    console.log(`✓ ${file}  ->  public/menu/${id}.webp`);
  }

  console.log(`\n${files.length} image(s) optimisée(s). Référence-les dans data/menu.json : "image": "/menu/<id>.webp".`);
}

main().catch((err) => {
  console.error("Échec de l'optimisation des images :", err);
  process.exit(1);
});
