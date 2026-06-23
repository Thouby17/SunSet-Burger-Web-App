"use client";

// Habillage global côté client : ajoute la barre de navigation en bas et
// l'espace nécessaire pour ne pas masquer le contenu. Désactivé sur /staff
// (l'écran staff a sa propre mise en page, sans navigation client).

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStaff = pathname.startsWith("/staff");

  if (isStaff) return <>{children}</>;

  return (
    <>
      {/* pb-20 = espace réservé pour la barre de navigation fixe */}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  );
}
