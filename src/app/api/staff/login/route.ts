// Connexion / déconnexion staff.
//   POST   { password } -> pose le cookie httpOnly si le mot de passe est bon
//   DELETE              -> supprime le cookie (déconnexion)

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getLocale } from "@/i18n/server";
import { translate, type MessageKey } from "@/i18n/messages";

// Anti-brute-force : limite les tentatives de connexion par IP.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: Request) {
  const locale = await getLocale();
  const err = (key: MessageKey) => translate(locale, key);

  // Limite avant tout traitement.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json({ error: err("err.tooManyAttempts") }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: err("err.invalidRequest") }, { status: 400 });
  }

  const expected = process.env.STAFF_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: err("err.staffNotConfigured") }, { status: 500 });
  }
  if (body.password !== expected) {
    return NextResponse.json({ error: err("err.wrongPassword") }, { status: 401 });
  }

  // Cookie "Secure" uniquement en HTTPS réel (marche aussi en local http).
  const proto =
    req.headers.get("x-forwarded-proto") ??
    new URL(req.url).protocol.replace(":", "");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("staff_auth", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 h
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("staff_auth", "", { path: "/", maxAge: 0 });
  return res;
}
