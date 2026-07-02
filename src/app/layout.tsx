import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";

// Serif éditorial pour les titres (look "menu de resto"). Exposée en variable
// CSS (--font-display), utilisée via la classe Tailwind `font-display` et les
// titres h1/h2/h3 (voir globals.css).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

// 🔧 À PERSONNALISER pour chaque nouveau client : title, description,
// applicationName ci-dessous, + les 3 fichiers public/*.webmanifest, +
// data/config.json (restaurantName), + public/logo.png et icon-app.png.
export const metadata: Metadata = {
  title: "SunSet Burger — Commander",
  description: "Commandez à distance vos burgers SunSet. Paiement sur place.",
  applicationName: "SunSet Burger",
  // Manifest CLIENT (par défaut). Les sections /staff et /admin le surchargent
  // dans leur propre layout pour pointer vers leur manifest dédié (start_url
  // /staff ou /admin) — on ne passe PLUS par la convention app/manifest.ts qui
  // imposait le même lien partout.
  manifest: "/manifest.webmanifest",
  // Logo officiel (badge) pour favicon + icône iOS / écran d'accueil.
  icons: { icon: "/icon-app.png", apple: "/icon-app.png" },
  // Plein écran + titre sous l'icône lors de l'ajout à l'écran d'accueil iOS.
  appleWebApp: {
    capable: true,
    title: "SunSet Burger",
    // "default" : barre de statut claire qui réserve sa place (thème clair) ;
    // "black-translucent" faisait passer le contenu sous l'heure/la batterie.
    statusBarStyle: "default",
  },
};

// Mobile-first : on cale la largeur sur l'appareil. On bloque le pinch-zoom
// (maximumScale=1) pour un ressenti "application" et éviter les zooms accidentels.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f1f3f7", // fond clair (thème clair moderne)
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={playfair.variable}>
      <head>
        {/* iOS : balise INDISPENSABLE pour lancer la PWA en plein écran (mode app)
            depuis l'écran d'accueil. Next.js n'émet que `mobile-web-app-capable`
            (ignoré par iOS) -> on ajoute explicitement la version préfixée Apple. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Précharge le logo du splash pour un affichage immédiat au lancement. */}
        <link rel="preload" as="image" href="/logo.png" />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
