"use client";

// Identification puis envoi de la commande. Aucun compte, aucun paiement en ligne.
//   - Client : prénom + téléphone obligatoires.
//   - Staff (comptoir) : nom/table obligatoire, téléphone facultatif.
//   - Mode livraison : adresse + téléphone obligatoires (pour le livreur).

import { useEffect, useRef, useState } from "react";
import type { OrderMode } from "@/lib/types";
import { formatPrice, modeKey } from "@/lib/format";
import {
  DEFAULT_COUNTRY,
  isValidPhone,
  normalizePhone,
  phoneExample,
  type CountryCode,
} from "@/lib/phone";
import CountrySelect from "@/components/CountrySelect";
import { useI18n } from "@/i18n/client";

export default function CheckoutForm({
  mode,
  total,
  phoneDisclaimer,
  submitting,
  error,
  staff = false,
  onBack,
  onSubmit,
}: {
  mode: OrderMode;
  total: number;
  phoneDisclaimer: string;
  submitting: boolean;
  error: string | null;
  staff?: boolean;
  onBack: () => void;
  onSubmit: (customerName: string, phone: string, address: string) => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [address, setAddress] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Autocomplétion d'adresse (mode livraison).
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function onAddressChange(v: string) {
    setAddress(v);
    setShowSug(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    // Débounce 300 ms + annulation de la requête précédente (évite les races).
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(v)}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: string[] };
        setSuggestions(data.suggestions ?? []);
      } catch {
        /* abort / réseau : on ignore */
      }
    }, 300);
  }

  function pickSuggestion(s: string) {
    setAddress(s);
    setSuggestions([]);
    setShowSug(false);
  }

  const isDelivery = mode === "delivery";
  // Téléphone obligatoire pour le client et pour toute livraison ; facultatif
  // uniquement pour une commande staff au comptoir (sur place / à emporter).
  const phoneRequired = isDelivery || !staff;
  const phoneValid = isValidPhone(phone, country);
  const phoneOk = phoneRequired
    ? phoneValid
    : phone.trim() === "" || phoneValid;
  const showPhoneError = phoneTouched && phone.trim().length > 0 && !phoneValid;

  const addressOk = !isDelivery || address.trim().length >= 6;
  const canSubmit = name.trim().length > 0 && phoneOk && addressOk && !submitting;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="self-start text-sm text-neutral-400">
        {t("checkout.back")}
      </button>

      <div>
        <h2 className="text-xl font-bold">
          {staff ? t("neworder.title") : t("checkout.title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {t("checkout.mode")}{" "}
          <span className="text-neutral-200">{t(modeKey(mode))}</span>
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">
          {staff ? t("neworder.nameLabel") : t("checkout.firstName")}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={staff ? t("neworder.namePlaceholder") : t("checkout.firstNamePlaceholder")}
          maxLength={60}
          autoComplete={staff ? "off" : "given-name"}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-brand"
        />
      </div>

      {/* Adresse de livraison (mode livraison uniquement) — avec autocomplétion */}
      {isDelivery && (
        <div className="relative">
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">
            {t("checkout.address")}
          </label>
          <input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder={t("checkout.addressPlaceholder")}
            maxLength={160}
            autoComplete="off"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-brand"
          />
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">
          {phoneRequired ? t("checkout.phone") : t("neworder.phoneOptional")}
        </label>
        {/* Indicatif pays (drapeau + +XX) collé au champ numéro. Le numéro est
            validé selon le format réel du pays choisi (libphonenumber). */}
        <div
          className={`flex rounded-xl border bg-neutral-950 focus-within:border-brand ${
            showPhoneError ? "border-red-500" : "border-neutral-800"
          }`}
        >
          <CountrySelect value={country} onChange={setCountry} />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            placeholder={phoneExample(country) || t("checkout.phonePlaceholder")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            className="w-full min-w-0 rounded-r-xl bg-transparent px-4 py-3 outline-none"
          />
        </div>
        {showPhoneError ? (
          <p className="mt-1.5 text-xs text-red-400">{t("checkout.phoneError")}</p>
        ) : (
          <p className="mt-1.5 text-xs text-neutral-400">{phoneDisclaimer}</p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        disabled={!canSubmit}
        onClick={() =>
          onSubmit(name.trim(), normalizePhone(phone, country) ?? "", address.trim())
        }
        className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
      >
        {submitting
          ? staff
            ? t("neworder.creating")
            : t("checkout.submitting")
          : staff
            ? t("neworder.create", { price: formatPrice(total, locale) })
            : t("checkout.submit", { price: formatPrice(total, locale) })}
      </button>
      <p className="text-center text-xs text-neutral-400">{t("checkout.payNote")}</p>
    </div>
  );
}
