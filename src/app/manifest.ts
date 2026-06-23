import type { MetadataRoute } from "next";

// Manifeste PWA : permet l'installation sur l'écran d'accueil (Android/Samsung)
// avec une vraie icône, en plein écran (sans la barre du navigateur).
// Next.js l'expose automatiquement sur /manifest.webmanifest.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brooklyn Food — Commander",
    short_name: "Brooklyn Food",
    description: "Commandez votre street food NYC. Paiement sur place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
