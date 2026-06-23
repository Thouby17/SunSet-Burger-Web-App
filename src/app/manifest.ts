import type { MetadataRoute } from "next";

// Manifeste PWA : permet l'installation sur l'écran d'accueil (Android/Samsung)
// avec une vraie icône, en plein écran (sans la barre du navigateur).
// Next.js l'expose automatiquement sur /manifest.webmanifest.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SunSet Burger — Commander",
    short_name: "SunSet Burger",
    description: "Commandez vos burgers SunSet. Paiement sur place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Le SVG (soleil plein cadre) sert d'icône "maskable" : le logo PNG, avec
      // son texte autour du cercle, serait rogné par le masque circulaire.
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
