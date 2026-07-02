"use client";

// Page de connexion administrateur : un simple champ mot de passe (ADMIN_PASSWORD).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import LangSwitcher from "@/components/LangSwitcher";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? t("adminLogin.failed"));
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminLogin.error"));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6">
      <div className="flex justify-center">
        <LangSwitcher />
      </div>
      <h1 className="text-center text-2xl font-extrabold">{t("adminLogin.title")}</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && password && submit()}
        placeholder={t("adminLogin.password")}
        autoFocus
        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-brand"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={!password || loading}
        className="w-full rounded-2xl bg-brand px-6 py-4 font-bold text-neutral-950 transition active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? t("adminLogin.signingIn") : t("adminLogin.signIn")}
      </button>
    </main>
  );
}
