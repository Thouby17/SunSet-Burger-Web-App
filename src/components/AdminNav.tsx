"use client";

// Barre de navigation fixe en bas pour l'app ADMIN. Remplace la barre client
// (Accueil/Menu/…) qui n'a aucun sens pour un administrateur et ne permettait
// pas de revenir au tableau de bord. S'affiche sur /admin et /admin/*.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function AvailabilityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <path d="M8 6v0M8 12v0M8 18v0" />
    </svg>
  );
}
function PriceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.5.6l7.4 7.4a2 2 0 0 1 0 2.8Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  );
}
function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const items: {
  href: string;
  labelKey: MessageKey;
  Icon: (p: IconProps) => React.ReactElement;
}[] = [
  { href: "/admin", labelKey: "adminNav.dashboard", Icon: DashboardIcon },
  { href: "/admin/menu", labelKey: "adminNav.availability", Icon: AvailabilityIcon },
  { href: "/admin/prices", labelKey: "adminNav.prices", Icon: PriceIcon },
  { href: "/admin/hours", labelKey: "adminNav.hours", Icon: ClockIcon },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-stretch justify-around">
        {items.map(({ href, labelKey, Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-center text-[11px] font-medium leading-tight transition ${
                active ? "text-brand" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon className="h-7 w-7" />
              {t(labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
