import { ImageResponse } from "next/og";

// Icône "Ajouter à l'écran d'accueil" pour iOS (Safari exige un PNG).
// Générée à la volée par Next.js — aucun fichier binaire à fournir.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5b301",
          color: "#0a0a0a",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        B
      </div>
    ),
    { ...size },
  );
}
