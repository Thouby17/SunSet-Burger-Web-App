import type { Metadata } from "next";

// Manifest DÉDIÉ au staff : installé sur l'écran d'accueil, il se lance sur /staff
// (et non sur le site client). Le scope reste "/" pour ne jamais basculer en vue
// navigateur lors des navigations (login, écran cuisine, etc.).
export const metadata: Metadata = {
  manifest: "/staff.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Brooklyn Staff",
    statusBarStyle: "default",
  },
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
