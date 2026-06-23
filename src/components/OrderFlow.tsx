"use client";

// Orchestrateur du parcours client :
//   mode -> menu (+ fiche plat) -> panier -> identification -> envoi -> /suivi/[id]

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Menu, MenuItem, OrderMode } from "@/lib/types";
import { formatPrice, modeKey } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { useCart, toOrderLines } from "@/store/cart";
import { addMyOrderToken } from "@/store/myOrders";
import BackButton from "./BackButton";
import ModeSelect from "./ModeSelect";
import MenuItemCard from "./MenuItemCard";
import ItemSheet from "./ItemSheet";
import CartSheet from "./CartSheet";
import CheckoutForm from "./CheckoutForm";

export default function OrderFlow({
  menu,
  open,
  restaurantName,
  phoneDisclaimer,
}: {
  menu: Menu;
  open: boolean;
  restaurantName: string;
  phoneDisclaimer: string;
}) {
  const router = useRouter();
  const cart = useCart();
  const { t, locale } = useI18n();

  const [mode, setMode] = useState<OrderMode | null>(null);
  const [view, setView] = useState<"menu" | "checkout">("menu");
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Catégorie active dans la barre de navigation (mise à jour au scroll).
  const [activeCat, setActiveCat] = useState<string>(menu.categories[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement | null>(null);

  // Scroll-spy : surligne la catégorie dont la section est en haut de l'écran.
  useEffect(() => {
    if (!mode || view !== "menu") return;
    const sections = menu.categories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCat(entry.target.id.replace("cat-", ""));
          }
        }
      },
      // La section "active" est celle qui passe dans le quart haut de l'écran.
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [mode, view, menu]);

  // Fait défiler jusqu'à une catégorie et la marque active.
  function scrollToCat(id: string) {
    setActiveCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Garde la puce active visible dans la barre horizontale.
  useEffect(() => {
    navRef.current
      ?.querySelector(`[data-cat="${activeCat}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCat]);

  // --- Restaurant fermé : on bloque la commande. ---
  if (!open) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">😴</span>
        <h1 className="text-2xl font-bold">{t("closed.title")}</h1>
        <p className="text-neutral-400">{t("closed.text")}</p>
        <a href="/" className="mt-2 text-sm text-brand underline underline-offset-4">
          {t("closed.backHome")}
        </a>
      </div>
    );
  }

  // --- Étape 1 : choix du mode. ---
  if (!mode) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col justify-center px-6 py-10">
        <h1 className="mb-8 text-center text-3xl font-extrabold text-brand">
          {restaurantName}
        </h1>
        <ModeSelect onSelect={setMode} />
      </main>
    );
  }

  // --- Envoi de la commande. ---
  async function submitOrder(customerName: string, phone: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          customerName,
          phone,
          items: toOrderLines(cart.lines),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? t("checkout.sendFailed"));
      }
      cart.clear();
      addMyOrderToken(data.token); // mémorise la commande (jeton) sur l'appareil du client
      router.push(`/suivi/${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.genericError"));
      setSubmitting(false);
    }
  }

  // --- Étape 3 : identification. ---
  if (view === "checkout") {
    return (
      <main className="mx-auto min-h-[calc(100dvh-5rem)] max-w-md px-5 py-6">
        <CheckoutForm
          mode={mode}
          total={cart.total}
          phoneDisclaimer={phoneDisclaimer}
          submitting={submitting}
          error={error}
          onBack={() => setView("menu")}
          onSubmit={submitOrder}
        />
      </main>
    );
  }

  // --- Étape 2 : menu + panier. ---
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-4">
      {/* En-tête : nom + mode (modifiable) */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-extrabold text-brand">{restaurantName}</h1>
        </div>
        <button
          onClick={() => setMode(null)}
          className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300"
        >
          {t(modeKey(mode))} ✎
        </button>
      </header>

      {/* Barre de navigation des catégories (collante, défilement horizontal) */}
      <nav
        ref={navRef}
        className="sticky top-0 z-30 -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-neutral-800 bg-neutral-950/95 px-4 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {menu.categories.map((cat) => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => scrollToCat(cat.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
              activeCat === cat.id
                ? "bg-brand font-semibold text-neutral-950"
                : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Menu par catégories */}
      {menu.categories.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="mb-6 scroll-mt-20">
          <h2 className="mb-2 text-lg font-bold">{cat.label}</h2>
          <div className="flex flex-col gap-3">
            {cat.items.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={setActiveItem} />
            ))}
          </div>
        </section>
      ))}

      {/* Barre panier fixe en bas */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 font-bold text-neutral-950 shadow-lg transition active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-950 px-1.5 text-sm text-brand">
                {cart.count}
              </span>
              {t("cart.view")}
            </span>
            <span>{formatPrice(cart.total, locale)}</span>
          </button>
        </div>
      )}

      {/* Fiche de personnalisation */}
      {activeItem && (
        <ItemSheet
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onConfirm={({ options, choices, note, qty }) => {
            cart.addLine({
              menuItemId: activeItem.id,
              name: activeItem.name,
              unitBasePrice: activeItem.price,
              options,
              choices,
              note,
              qty,
            });
            setActiveItem(null);
          }}
        />
      )}

      {/* Panier */}
      {cartOpen && (
        <CartSheet
          lines={cart.lines}
          total={cart.total}
          onClose={() => setCartOpen(false)}
          onUpdateQty={cart.updateQty}
          onRemove={cart.removeLine}
          onClear={() => {
            cart.clear();
            setCartOpen(false);
          }}
          onCheckout={() => {
            setCartOpen(false);
            setView("checkout");
          }}
        />
      )}
    </main>
  );
}
