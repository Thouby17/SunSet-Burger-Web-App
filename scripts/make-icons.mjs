// Génère logo.png (accueil/nav) et icon-app.png (favicon/PWA/iOS) à partir du
// logo source du client. Dépose le logo source (idéalement carré, fond
// transparent ou opaque) dans branding/logo-source.png, puis lance :
//   node scripts/make-icons.mjs
// ⚠️ Vérifie d'abord que le PNG a une VRAIE transparence si besoin
// (sharp(SRC).metadata().then(m => console.log(m.hasAlpha))) — un export IA
// "transparent" peut en réalité être un damier peint dans les pixels, voir
// docs/PROJET-COMPLET.md §8.14 pour ce piège précis.
import { existsSync } from "node:fs";
import sharp from "sharp";

const SRC = process.argv[2] ?? "branding/logo-source.png";

if (!existsSync(SRC)) {
  console.error(
    `❌ Fichier source introuvable : ${SRC}\nDépose le logo du client dans branding/logo-source.png, ou passe un chemin : node scripts/make-icons.mjs chemin/vers/logo.png`,
  );
  process.exit(1);
}

// 512 px suffit largement (affichage max ~210 px, icône PWA/maskable = 512).
// PNG en palette : logo à aplats -> poids divisé par ~10, sans perte visible.
await sharp(SRC)
  .resize(512, 512, { fit: "contain", background: "#ffffff" })
  .png({ compressionLevel: 9, palette: true })
  .toFile("public/logo.png");

await sharp(SRC)
  .resize(512, 512, { fit: "contain", background: "#ffffff" })
  .png({ compressionLevel: 9, palette: true })
  .toFile("public/icon-app.png");

console.log("✓ public/logo.png et public/icon-app.png générés (512x512, optimisés) depuis", SRC);
