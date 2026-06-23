import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Brooklyn Food — Commander",
  description: "Commandez à distance votre street food NYC. Paiement sur place.",
  applicationName: "Brooklyn Food",
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
  // Plein écran + titre sous l'icône lors de l'ajout à l'écran d'accueil iOS.
  appleWebApp: {
    capable: true,
    title: "Brooklyn Food",
    statusBarStyle: "black-translucent",
  },
};

// Mobile-first : on cale la largeur sur l'appareil.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
