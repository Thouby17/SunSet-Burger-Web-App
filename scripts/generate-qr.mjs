// Génère les QR codes des établissements (lien profond /?l=<id>) au format
// SVG (impression nette, redimensionnable) et PNG haute résolution.
//
// Usage (BASE_URL OBLIGATOIRE — ⚠️ pas de valeur par défaut : un oubli
// pointerait les QR codes vers le domaine d'un AUTRE client) :
//   BASE_URL=https://mon-domaine.be node scripts/generate-qr.mjs
//   BASE_URL=http://localhost:3000 node scripts/generate-qr.mjs
//
// Les fichiers sont écrits dans le dossier  qr/  à la racine du projet.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

if (!process.env.BASE_URL) {
  console.error(
    "❌ BASE_URL manquant. Usage : BASE_URL=https://mon-domaine.be node scripts/generate-qr.mjs",
  );
  process.exit(1);
}
const BASE_URL = process.env.BASE_URL.replace(/\/$/, "");
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "qr");

const qrOptions = {
  errorCorrectionLevel: "M", // bon compromis robustesse / densité
  margin: 2,
  color: { dark: "#000000", light: "#FFFFFF" },
};

async function main() {
  const configRaw = await readFile(path.join(ROOT, "data", "config.json"), "utf-8");
  const config = JSON.parse(configRaw);
  const locations = config.locations ?? [];

  await mkdir(OUT_DIR, { recursive: true });

  for (const loc of locations) {
    const url = `${BASE_URL}/?l=${encodeURIComponent(loc.id)}`;

    // SVG (vectoriel, idéal pour l'impression grand format).
    const svg = await QRCode.toString(url, { ...qrOptions, type: "svg", width: 1024 });
    await writeFile(path.join(OUT_DIR, `qr-${loc.id}.svg`), svg, "utf-8");

    // PNG haute résolution (~2000 px, pratique pour stickers/affiches).
    await QRCode.toFile(path.join(OUT_DIR, `qr-${loc.id}.png`), url, {
      ...qrOptions,
      width: 2000,
    });

    console.log(`✓ ${loc.name.padEnd(14)} -> ${url}`);
    console.log(`    qr/qr-${loc.id}.svg`);
    console.log(`    qr/qr-${loc.id}.png`);
  }

  console.log(`\n${locations.length} établissement(s) — QR codes générés dans ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Échec de la génération des QR codes :", err);
  process.exit(1);
});
