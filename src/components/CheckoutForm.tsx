"use client";

// Identification minimale (prénom + téléphone) puis envoi de la commande.
// Aucun compte, aucun paiement en ligne.

import { useState } from "react";
import type { OrderMode } from "@/lib/types";
import { formatPrice, modeKey } from "@/lib/format";
import { isValidBeMobile } from "@/lib/phone";
import { useI18n } from "@/i18n/client";

export default function CheckoutForm({
  mode,
  total,
  phoneDisclaimer,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  mode: OrderMode;
  total: number;
  phoneDisclaimer: string;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (customerName: string, phone: string) => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // L'erreur de format ne s'affiche qu'après une première saisie (évite de
  // crier sur l'utilisateur dès l'arrivée sur le formulaire).
  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneValid = isValidBeMobile(phone);
  const showPhoneError = phoneTouched && phone.trim().length > 0 && !phoneValid;
  const canSubmit = name.trim().length > 0 && phoneValid && !submitting;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="self-start text-sm text-neutral-400">
        {t("checkout.back")}
      </button>

      <div>
        <h2 className="text-xl font-bold">{t("checkout.title")}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {t("checkout.mode")}{" "}
          <span className="text-neutral-200">{t(modeKey(mode))}</span>
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">
          {t("checkout.firstName")}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("checkout.firstNamePlaceholder")}
          maxLength={60}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">
          {t("checkout.phone")}
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setPhoneTouched(true)}
          placeholder={t("checkout.phonePlaceholder")}
          inputMode="tel"
          maxLength={20}
          className={`w-full rounded-xl border bg-neutral-950 px-4 py-3 outline-none focus:border-brand ${
            showPhoneError ? "border-red-500" : "border-neutral-800"
          }`}
        />
        {showPhoneError ? (
          <p className="mt-1.5 text-xs text-red-400">{t("checkout.phoneError")}</p>
        ) : (
          <p className="mt-1.5 text-xs text-neutral-500">{phoneDisclaimer}</p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        disabled={!canSubmit}
        onClick={() => onSubmit(name.trim(), phone.trim())}
        className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
      >
        {submitting
          ? t("checkout.submitting")
          : t("checkout.submit", { price: formatPrice(total, locale) })}
      </button>
      <p className="text-center text-xs text-neutral-500">{t("checkout.payNote")}</p>
    </div>
  );
}
