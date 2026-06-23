// Protection par mot de passe de l'écran staff et de ses endpoints sensibles.
//
// Principe : la page /staff/login pose un cookie httpOnly `staff_auth` contenant
// le mot de passe ; ce middleware vérifie ce cookie pour :
//   - la page /staff
//   - GET  /api/orders        (liste complète = données clients)
//   - PATCH /api/orders/[id]   (actions staff)
// Restent PUBLICS : POST /api/orders (créer) et GET /api/orders/[id] (suivi client).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAuthed(req: NextRequest): boolean {
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) return false; // pas de mot de passe configuré => on bloque par sécurité
  return req.cookies.get("staff_auth")?.value === expected;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // La page de login reste accessible.
  if (pathname === "/staff/login") return NextResponse.next();

  // --- Pages /staff et /staff/* (ex. /staff/historique) ---
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (isAuthed(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/staff/login";
    return NextResponse.redirect(url);
  }

  // Suivi public par jeton : toujours accessible.
  if (pathname.startsWith("/api/orders/track/")) return NextResponse.next();

  // --- API sensibles ---
  // - GET /api/orders          : liste complète (données clients)
  // - GET/PATCH /api/orders/[id] : détail + actions staff (id séquentiel)
  // Restent publics : POST /api/orders (créer) et /api/orders/track/[token].
  const isOrdersList = pathname === "/api/orders" && method === "GET";
  const isOrderItem = /^\/api\/orders\/[^/]+$/.test(pathname); // GET ou PATCH

  if (isOrdersList || isOrderItem) {
    if (isAuthed(req)) return NextResponse.next();
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  // On limite l'exécution du middleware aux routes concernées.
  matcher: ["/staff", "/staff/:path*", "/api/orders", "/api/orders/:path*"],
};
