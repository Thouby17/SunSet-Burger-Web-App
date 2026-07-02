// Génère une affiche PDF (A4) prête à imprimer avec le QR code de chaque
// établissement (lien profond /?l=<id> -> sélection automatique côté client).
//
// Usage (BASE_URL OBLIGATOIRE — ⚠️ pas de valeur par défaut : un oubli
// pointerait les QR codes vers le domaine d'un AUTRE client) :
//   BASE_URL=https://mon-domaine.be node scripts/generate-qr-pdf.mjs
//   BASE_URL=http://localhost:3000 node scripts/generate-qr-pdf.mjs
//
// Sortie : qr/restaurant-qr.pdf  (2 établissements par page A4).

import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

if (!process.env.BASE_URL) {
  console.error(
    "❌ BASE_URL manquant. Usage : BASE_URL=https://mon-domaine.be node scripts/generate-qr-pdf.mjs",
  );
  process.exit(1);
}
const BASE_URL = process.env.BASE_URL.replace(/\/$/, "");
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "qr");
const OUT_PDF = path.join(OUT_DIR, "restaurant-qr.pdf");

const BRAND = "#d99a00";
const INK = "#111111";
const MUTED = "#666666";

async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "data", "config.json"), "utf-8"));
  const restaurantName = config.restaurantName ?? "Restaurant";
  const locations = config.locations ?? [];
  if (locations.length === 0) throw new Error("Aucun établissement dans data/config.json");

  // Pré-génère un PNG QR (haute résolution) par établissement.
  const qrByLoc = new Map();
  for (const loc of locations) {
    const url = `${BASE_URL}/?l=${encodeURIComponent(loc.id)}`;
    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 1000,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    qrByLoc.set(loc.id, { png, url });
  }

  await mkdir(OUT_DIR, { recursive: true });

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(createWriteStream(OUT_PDF));

  const PAGE_W = doc.page.width; // 595.28
  const PAGE_H = doc.page.height; // 841.89
  const logoPath = path.join(ROOT, "public", "logo.png");
  let logo = null;
  if (existsSync(logoPath)) {
    try {
      const img = doc.openImage(logoPath); // dimensions naturelles -> mise en page exacte
      const scale = Math.min(120 / img.width, 64 / img.height);
      logo = { path: logoPath, w: img.width * scale, h: img.height * scale };
    } catch {
      logo = null; // logo illisible -> on l'ignore
    }
  }

  const PER_PAGE = 2;
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const slot = i % PER_PAGE; // 0 = haut, 1 = bas
    if (i > 0 && slot === 0) doc.addPage();

    const cellTop = slot * (PAGE_H / PER_PAGE);
    const cellH = PAGE_H / PER_PAGE;
    drawCard(doc, { loc, qr: qrByLoc.get(loc.id), restaurantName, cellTop, cellH, PAGE_W, logo });

    // Trait de coupe discret entre les deux moitiés.
    if (slot === 0 && i + 1 < locations.length) {
      doc.save();
      doc.dash(4, { space: 4 }).moveTo(40, cellTop + cellH).lineTo(PAGE_W - 40, cellTop + cellH)
        .strokeColor("#cccccc").lineWidth(0.5).stroke();
      doc.undash().restore();
    }
  }

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));
  console.log(`✓ Affiche PDF générée : ${OUT_PDF}`);
  console.log(`  ${locations.length} établissement(s), base URL ${BASE_URL}`);
}

// Dimensions (en points) de chaque bloc de la carte — sert à calculer la
// hauteur totale puis à centrer verticalement la carte dans sa demi-page.
const QR = 165;
const GAP = { afterLogo: 8, afterName: 6, afterLoc: 4, afterAddr: 12, afterQr: 14, afterCta: 6 };
const FONT = { name: 24, loc: 17, addr: 10, cta: 15, url: 9 };

function drawCard(doc, { loc, qr, restaurantName, cellTop, cellH, PAGE_W, logo }) {
  const hasAddr = Boolean(loc.address);

  // Hauteur totale du contenu pour le centrer verticalement dans la cellule.
  const contentH =
    (logo ? logo.h + GAP.afterLogo : 0) +
    FONT.name + GAP.afterName +
    FONT.loc + GAP.afterLoc +
    (hasAddr ? FONT.addr + GAP.afterAddr : GAP.afterAddr) +
    QR + GAP.afterQr +
    FONT.cta + GAP.afterCta +
    FONT.url;

  let y = cellTop + Math.max(20, (cellH - contentH) / 2);

  if (logo) {
    doc.image(logo.path, PAGE_W / 2 - logo.w / 2, y, { width: logo.w, height: logo.h });
    y += logo.h + GAP.afterLogo;
  }

  doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(FONT.name)
    .text(restaurantName, 0, y, { width: PAGE_W, align: "center", lineBreak: false });
  y += FONT.name + GAP.afterName;

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(FONT.loc)
    .text(loc.name ?? "", 0, y, { width: PAGE_W, align: "center", lineBreak: false });
  y += FONT.loc + GAP.afterLoc;

  if (hasAddr) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(FONT.addr)
      .text(loc.address, 0, y, { width: PAGE_W, align: "center", lineBreak: false });
    y += FONT.addr + GAP.afterAddr;
  } else {
    y += GAP.afterAddr;
  }

  doc.image(qr.png, PAGE_W / 2 - QR / 2, y, { width: QR, height: QR });
  y += QR + GAP.afterQr;

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(FONT.cta)
    .text("Scannez pour commander", 0, y, { width: PAGE_W, align: "center", lineBreak: false });
  y += FONT.cta + GAP.afterCta;

  doc.fillColor(MUTED).font("Helvetica").fontSize(FONT.url)
    .text(qr.url, 0, y, { width: PAGE_W, align: "center", lineBreak: false });
}

main().catch((err) => {
  console.error("Échec de la génération du PDF :", err);
  process.exit(1);
});
