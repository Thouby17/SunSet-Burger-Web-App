"use client";

// Habillage global côté client : ajoute la barre de navigation en bas et
// l'espace nécessaire pour ne pas masquer le contenu. Désactivé sur /staff
// (l'écran staff a sa propre mise en page, sans navigation client).

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import TopNav from "./TopNav";
import AdminNav from "./AdminNav";
import InstallPrompt from "./InstallPrompt";
import LangSwitcher from "./LangSwitcher";
import SplashScreen from "./SplashScreen";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStaff = pathname.startsWith("/staff");
  // Espace admin : barre du bas dédiée (Dashboard + Disponibilité), pas la barre
  // client. La page de connexion reste nue (pas de nav avant authentification).
  const isAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";

  // Staff : mise en page propre (boutons de nav dans les pages elles-mêmes).
  if (isStaff) return <>{children}</>;

  // Admin connecté : contenu + barre du bas admin.
  if (isAdmin) {
    return (
      <>
        <div className="pb-24">{children}</div>
        <AdminNav />
      </>
    );
  }

  return (
    <>
      <SplashScreen />
      {/* Desktop : barre de nav en haut. Mobile/tablette : barre du bas. */}
      <TopNav />
      {/* pb-24 = espace pour la barre du bas (mobile) ; lg:pt-16 = sous la TopNav. */}
      <div className="pb-24 lg:pb-10 lg:pt-16">
        {/* Sélecteur de langue en haut (mobile/tablette uniquement ; sur desktop il est dans la TopNav). */}
        <header className="flex justify-end px-4 pt-3 lg:hidden">
          <LangSwitcher />
        </header>
        <InstallPrompt />
        {children}
      </div>
      <BottomNav />
    </>
  );
}
