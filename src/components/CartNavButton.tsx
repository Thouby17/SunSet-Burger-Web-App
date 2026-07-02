"use client";

// Icône panier dans la barre de navigation (haut sur desktop, bas sur mobile).
// Toujours visible -> le client sait OÙ est son panier. Badge avec le nombre
// d'articles (pulse à l'ajout). Cible de l'animation "vol vers le panier"
// (attribut data-cart-target). Au clic : ouvre le panier (même page) ou y mène.

import { useRouter, usePathname } from "next/navigation";
import { useCartCount } from "@/store/cart";
import { useI18n } from "@/i18n/client";

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  return (
    // `key` -> remonté à chaque changement -> rejoue l'animation "pop" (feedback ajout).
    <span
      key={count}
      className="absolute -right-2 -top-2 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-neutral-950 ring-2 ring-neutral-950"
    >
      {count}
    </span>
  );
}

export default function CartNavButton({ variant }: { variant: "top" | "bottom" }) {
  const count = useCartCount();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  function openCart() {
    if (pathname.startsWith("/commander")) {
      window.dispatchEvent(new Event("cart:open"));
    } else {
      router.push("/commander?cart=open");
    }
  }

  if (variant === "bottom") {
    return (
      <button
        onClick={openCart}
        data-cart-target
        aria-label={t("nav.cart")}
        className="flex flex-1 flex-col items-center gap-1 py-3 text-center text-xs font-medium leading-tight text-neutral-400 transition hover:text-neutral-200"
      >
        <span className="relative">
          <BagIcon className="h-7 w-7" />
          {count > 0 && <Badge count={count} />}
        </span>
        {t("nav.cart")}
      </button>
    );
  }

  // Desktop (TopNav)
  return (
    <button
      onClick={openCart}
      data-cart-target
      aria-label={t("nav.cart")}
      className="relative rounded-full p-2 text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
    >
      <BagIcon className="h-6 w-6" />
      {count > 0 && <Badge count={count} />}
    </button>
  );
}
