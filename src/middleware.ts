// Protection par mot de passe des écrans staff/admin et des endpoints sensibles.
//
// Deux rôles :
//   - STAFF  (cookie `staff_auth` = STAFF_PASSWORD)  -> écran cuisine, menu, historique
//   - ADMIN  (cookie `admin_auth` = ADMIN_PASSWORD)  -> tableau de bord ventes,
//            suppression de commandes. L'admin a AUSSI accès aux écrans staff.
//
// Restent PUBLICS : POST /api/orders (créer), GET /api/orders/track/[token]
// (suivi client) et /api/push/* (abonnement notifications).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isStaff(req: NextRequest): boolean {
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) return false;
  return req.cookies.get("staff_auth")?.value === expected;
}

function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return req.cookies.get("admin_auth")?.value === expected;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Pages ET API de connexion : toujours accessibles (sinon impossible de se
  // connecter — /api/admin/login serait bloqué par le filtre admin ci-dessous).
  if (
    pathname === "/staff/login" ||
    pathname === "/admin/login" ||
    pathname === "/api/staff/login" ||
    pathname === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  // --- Espace ADMIN (dashboard + suppression) ---
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (isAdmin(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // --- Pages /staff et /staff/* (staff OU admin) ---
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (isStaff(req) || isAdmin(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/staff/login";
    return NextResponse.redirect(url);
  }

  // Suivi public par jeton : toujours accessible.
  if (pathname.startsWith("/api/orders/track/")) return NextResponse.next();

  // --- API réservées à l'ADMIN ---
  //   - DELETE /api/orders/[id]  (suppression définitive)
  //   - /api/admin/*             (statistiques, etc.)
  const isOrderItem = /^\/api\/orders\/[^/]+$/.test(pathname);
  if (pathname.startsWith("/api/admin/") || (isOrderItem && method === "DELETE")) {
    if (isAdmin(req)) return NextResponse.next();
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // --- API réservées au STAFF (ou admin) ---
  //   - GET /api/orders                  (liste = données clients)
  //   - GET/PATCH /api/orders/[id]       (détail + actions staff)
  //   - GET/POST /api/availability       (gestion des dispos)
  const isOrdersList = pathname === "/api/orders" && method === "GET";
  const isAvailability = pathname === "/api/availability";
  if (isOrdersList || isOrderItem || isAvailability) {
    if (isStaff(req) || isAdmin(req)) return NextResponse.next();
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/staff",
    "/staff/:path*",
    "/admin",
    "/admin/:path*",
    "/api/orders",
    "/api/orders/:path*",
    "/api/availability",
    "/api/admin/:path*",
  ],
};
