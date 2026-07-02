import type { Metadata } from "next";

// Manifest DÉDIÉ à l'admin : installé sur l'écran d'accueil, il se lance sur /admin
// (et non sur le site client). Le scope reste "/" pour ne jamais basculer en vue
// navigateur lors des navigations (login, lien "écran cuisine", etc.).
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Brooklyn Admin",
    statusBarStyle: "default",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
