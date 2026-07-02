"use client";

// Orchestrateur du parcours client :
//   menu (+ fiche plat) -> panier -> choix du mode (livraison/à emporter/sur
//   place, APRÈS le panier ; sauté s'il n'y a qu'un mode) -> identification
//   -> envoi -> /suivi/[id]

import { useEffect, useMemo, useRef, useState } from "react";
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

// Catégories "complémentaires" proposées au panier (upsell), par priorité.
// Si le panier ne contient aucun article de cette catégorie, on suggère ses
// articles (les "populaires" d'abord). Les ids doivent matcher data/menu.json.
const SUGGESTION_CATEGORY_IDS = ["boissons"];
const MAX_PER_CATEGORY = 2;
const MAX_SUGGESTIONS = 3;

export default function OrderFlow({
  menu,
  open,
  restaurantName,
  locationId,
  locationName,
  phoneDisclaimer,
  disabledItemIds = [],
  staff = false,
  modes,
}: {
  menu: Menu;
  open: boolean;
  restaurantName: string;
  locationId: string;
  locationName: string;
  phoneDisclaimer: string;
  disabledItemIds?: string[];
  staff?: boolean;
  modes?: OrderMode[];
}) {
  const router = useRouter();
  const cart = useCart(locationId);
  const { t, locale } = useI18n();

  // Modes proposés par l'établissement.
  const availableModes = modes ?? ["dine_in", "takeaway"];

  const [mode, setMode] = useState<OrderMode | null>(null);
  const [view, setView] = useState<"menu" | "mode" | "checkout">("menu");
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Staff : id de la commande qui vient d'être créée au comptoir (écran succès).
  const [createdId, setCreatedId] = useState<number | null>(null);
  // Catégorie active dans la barre de navigation (mise à jour au scroll).
  const [activeCat, setActiveCat] = useState<string>(menu.categories[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement | null>(null);

  // Ouverture du panier déclenchée par l'icône panier de la barre de navigation.
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener("cart:open", open);
    return () => window.removeEventListener("cart:open", open);
  }, []);

  // Lien profond ?cart=open : l'icône panier d'une AUTRE page mène ici en
  // ouvrant directement le panier (même vide -> message + invite vers le menu).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cart") === "open") setCartOpen(true);
  }, []);

  // Scroll-spy : surligne la catégorie dont la section est en haut de l'écran.
  useEffect(() => {
    if (view !== "menu") return;
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
  }, [view, menu]);

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

  // Catégorie de chaque plat (sert aux suggestions par catégorie).
  // ⚠️ Doit rester avant tout `return` conditionnel : un hook ne peut pas être
  // appelé de façon conditionnelle (sinon React error #310).
  const categoryOfItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of menu.categories) for (const it of c.items) m.set(it.id, c.id);
    return m;
  }, [menu]);

  // Plats indisponibles (rupture de stock) pour cet établissement.
  const disabledSet = useMemo(() => new Set(disabledItemIds), [disabledItemIds]);

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

  // --- Envoi de la commande. ---
  async function submitOrder(customerName: string, phone: string, address: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: locationId,
          mode,
          customerName,
          phone,
          address: mode === "delivery" ? address : undefined,
          items: toOrderLines(cart.lines),
          // Vrai uniquement pour la saisie au comptoir (/staff/nouvelle-commande).
          // Permet au serveur de distinguer une commande staff d'une commande
          // client passée depuis un navigateur où le staff est aussi connecté.
          staffEntry: staff,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? t("checkout.sendFailed"));
      }
      cart.clear();
      if (staff) {
        // Commande saisie au comptoir : écran de confirmation (pas de suivi client).
        setCreatedId(data.id);
      } else {
        addMyOrderToken(data.token); // mémorise la commande (jeton) sur l'appareil du client
        router.push(`/suivi/${data.token}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.genericError"));
      setSubmitting(false);
    }
  }

  /** Staff : prêt à saisir une nouvelle commande après en avoir créé une. */
  function startNewOrder() {
    setCreatedId(null);
    setSubmitting(false);
    setError(null);
    setMode(null);
    setView("menu");
  }

  // Suggestions d'upsell : pour chaque catégorie complémentaire (boissons…)
  // absente du panier, propose ses articles (populaires d'abord).
  const cartItemIds = new Set(cart.lines.map((l) => l.menuItemId));
  const cartCategoryIds = new Set(
    cart.lines.map((l) => categoryOfItem.get(l.menuItemId)).filter(Boolean),
  );
  const suggestions = SUGGESTION_CATEGORY_IDS.flatMap((catId) => {
    if (cartCategoryIds.has(catId)) return []; // déjà une boisson
    const cat = menu.categories.find((c) => c.id === catId);
    if (!cat) return [];
    return cat.items
      .filter((it) => !cartItemIds.has(it.id) && !disabledSet.has(it.id))
      .sort(
        (a, b) =>
          Number(b.badges?.includes("popular") ?? false) -
          Number(a.badges?.includes("popular") ?? false),
      )
      .slice(0, MAX_PER_CATEGORY);
  }).slice(0, MAX_SUGGESTIONS);

  function addSuggestion(it: MenuItem) {
    cart.addLine({
      menuItemId: it.id,
      name: it.name,
      image: it.image,
      unitBasePrice: it.price,
      options: [],
      choices: [],
      note: "",
      qty: 1,
    });
  }

  // Depuis le panier : choix du mode (livraison / à emporter / sur place)
  // APRÈS avoir constitué le panier. S'il n'y a qu'un seul mode, on saute
  // l'étape et on va directement à l'identification.
  function proceedFromCart() {
    setCartOpen(false);
    if (mode) {
      setView("checkout");
    } else if (availableModes.length === 1) {
      setMode(availableModes[0]);
      setView("checkout");
    } else {
      setView("mode");
    }
  }

  // --- Staff : confirmation après création d'une commande au comptoir. ---
  if (createdId !== null) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">✅</span>
        <h1 className="text-2xl font-bold">{t("neworder.added", { id: createdId })}</h1>
        <button
          onClick={startNewOrder}
          className="mt-2 rounded-2xl bg-brand px-6 py-3 font-bold text-neutral-950 transition active:scale-[0.98]"
        >
          {t("neworder.another")}
        </button>
        <a href="/staff" className="text-sm text-neutral-400 underline underline-offset-4">
          {t("menu.backLive")}
        </a>
      </main>
    );
  }

  // --- Étape : choix du mode (après le panier, si plusieurs modes possibles). ---
  if (view === "mode") {
    return (
      <main className="mx-auto min-h-[calc(100dvh-5rem)] max-w-md px-5 py-8">
        <button
          onClick={() => setView("menu")}
          className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
        >
          ← {t("cart.browseMenu")}
        </button>
        <ModeSelect
          onSelect={(m) => {
            setMode(m);
            setView("checkout");
          }}
          modes={availableModes}
        />
      </main>
    );
  }

  // --- Étape 3 : identification. ---
  if (view === "checkout") {
    return (
      <main className="mx-auto min-h-[calc(100dvh-5rem)] max-w-md px-5 py-6">
        {availableModes.length > 1 && (
          <button
            onClick={() => setView("mode")}
            className="mb-4 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300"
          >
            {t(modeKey(mode ?? availableModes[0]))} ✎
          </button>
        )}
        <CheckoutForm
          mode={mode ?? availableModes[0]}
          total={cart.total}
          phoneDisclaimer={phoneDisclaimer}
          submitting={submitting}
          error={error}
          staff={staff}
          onBack={() => setView("menu")}
          onSubmit={submitOrder}
        />
      </main>
    );
  }

  // --- Étape 2 : menu + panier. ---
  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-4 md:max-w-5xl md:px-6 lg:max-w-6xl xl:max-w-[1400px]">
      {/* En-tête : nom de l'établissement */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton />
          <div className="leading-tight">
            <h1 className="text-2xl font-extrabold text-brand">{restaurantName}</h1>
            <span className="text-xs font-medium text-neutral-400">{locationName}</span>
          </div>
        </div>
      </header>

      {/* Barre de navigation des catégories (collante, défilement horizontal) */}
      <nav
        ref={navRef}
        className="sticky top-0 z-30 -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-neutral-800 bg-neutral-950/95 px-4 py-2 backdrop-blur lg:top-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {menu.categories.map((cat) => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => scrollToCat(cat.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition ${
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
        <section key={cat.id} id={`cat-${cat.id}`} className="mb-6 scroll-mt-20 md:mb-8 md:scroll-mt-24">
          <h2 className="mb-2 text-lg font-bold md:mb-3 md:text-xl">{cat.label}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cat.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={setActiveItem}
                unavailable={disabledSet.has(item.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Barre panier fixe en bas */}
      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto max-w-md p-4 md:inset-x-auto md:bottom-24 md:right-6 md:mx-0 md:w-80 md:max-w-none md:p-0">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 font-bold text-neutral-950 shadow-lg transition active:scale-[0.98] md:shadow-2xl md:ring-1 md:ring-black/20"
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
              image: activeItem.image,
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
          suggestions={suggestions}
          onAddSuggestion={addSuggestion}
          onClose={() => setCartOpen(false)}
          onUpdateQty={cart.updateQty}
          onRemove={cart.removeLine}
          onClear={() => {
            cart.clear();
            setCartOpen(false);
          }}
          onCheckout={proceedFromCart}
        />
      )}
    </main>
  );
}
