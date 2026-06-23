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
      // Emblème central recadré : net en petit, et l'objet (burger) reste
      // centré donc compatible avec le masque "maskable" (Android).
      { src: "/icon-app.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/icon-app.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
    ],
  };
}
