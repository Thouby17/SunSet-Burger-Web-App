import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "SunSet Burger — Commander",
  description: "Commandez à distance vos burgers SunSet. Paiement sur place.",
  applicationName: "SunSet Burger",
  // Icône nette (emblème recadré) pour favicon + icône iOS / écran d'accueil.
  icons: { icon: "/icon-app.png", apple: "/icon-app.png" },
  // Plein écran + titre sous l'icône lors de l'ajout à l'écran d'accueil iOS.
  appleWebApp: {
    capable: true,
    title: "SunSet Burger",
    statusBarStyle: "black-translucent",
  },
};

// Mobile-first : on cale la largeur sur l'appareil.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
