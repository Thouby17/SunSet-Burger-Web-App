"use client";

// Barre de navigation fixe en bas (côté client uniquement).
// Masquée sur les écrans staff.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import LangSwitcher from "./LangSwitcher";

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function ReceiptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 7h6M9 11h6" />
    </svg>
  );
}
function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

const items: { href: string; labelKey: MessageKey; Icon: (p: IconProps) => React.ReactElement }[] = [
  { href: "/", labelKey: "nav.home", Icon: HomeIcon },
  { href: "/commander", labelKey: "nav.menu", Icon: MenuIcon },
  { href: "/mes-commandes", labelKey: "nav.myOrders", Icon: ReceiptIcon },
  { href: "/contact", labelKey: "nav.contact", Icon: PhoneIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (pathname.startsWith("/staff")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        <div className="flex items-center pl-2 pr-1">
          <LangSwitcher />
        </div>
        {items.map(({ href, labelKey, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-[11px] leading-tight transition ${
                active ? "text-brand" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon className="h-6 w-6" />
              {t(labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
