"use client";

// Barre de navigation supérieure — affichée uniquement sur grand écran (lg+),
// plus "desktop-native" que la barre du bas. Sur mobile/tablette, c'est la
// BottomNav qui prend le relais. Masquée sur les écrans staff.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import LangSwitcher from "./LangSwitcher";
import CartNavButton from "./CartNavButton";

const items: { href: string; labelKey: MessageKey }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/commander", labelKey: "nav.menu" },
  { href: "/mes-commandes", labelKey: "nav.myOrders" },
  { href: "/contact", labelKey: "nav.contact" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (pathname.startsWith("/staff")) return null;

  return (
    <nav className="fixed inset-x-0 top-0 z-40 hidden border-b border-neutral-800 bg-neutral-950/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-8">
        {/* Logo (générique, fonctionne pour tout client) */}
        <Link href="/" aria-label={t("nav.home")} className="transition active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="h-14 w-14 rounded-xl bg-white object-contain p-1 shadow-sm transition duration-200 hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-1">
          {items.map(({ href, labelKey }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${
                  active
                    ? "bg-brand text-neutral-950"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                }`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <CartNavButton variant="top" />
          <LangSwitcher />
        </div>
      </div>
    </nav>
  );
}
