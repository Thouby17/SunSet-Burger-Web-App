"use client";

// Première étape du parcours : choix du mode, selon les modes proposés par
// l'établissement (par défaut "Sur place" + "À emporter" ; certains points
// proposent "Se faire livrer").

import type { OrderMode } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

const MODE_META: Record<
  OrderMode,
  { icon: string; labelKey: MessageKey; subKey: MessageKey }
> = {
  dine_in: { icon: "🍽️", labelKey: "mode.dineIn", subKey: "mode.dineInSub" },
  takeaway: { icon: "🥡", labelKey: "mode.takeaway", subKey: "mode.takeawaySub" },
  delivery: { icon: "🛵", labelKey: "mode.delivery", subKey: "mode.deliverySub" },
};

export default function ModeSelect({
  onSelect,
  modes = ["dine_in", "takeaway"],
}: {
  onSelect: (mode: OrderMode) => void;
  modes?: OrderMode[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-lg font-semibold text-neutral-300">
        {t("mode.question")}
      </h2>

      <div className={`grid gap-4 ${modes.length > 1 ? "md:grid-cols-2" : ""}`}>
        {modes.map((m) => {
          const meta = MODE_META[m];
          return (
            <button
              key={m}
              onClick={() => onSelect(m)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center transition active:scale-[0.98] hover:border-brand md:p-8"
            >
              <span className="text-3xl md:text-4xl">{meta.icon}</span>
              <span className="text-lg font-bold">{t(meta.labelKey)}</span>
              <span className="text-sm text-neutral-400">{t(meta.subKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
