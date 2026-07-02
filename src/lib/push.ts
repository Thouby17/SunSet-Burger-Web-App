// Envoi de notifications Web Push (côté serveur) via les abonnements stockés.
//
// Permet de notifier :
//   - le STAFF d'une cuisine quand une nouvelle commande arrive,
//   - le CLIENT quand sa commande change de statut (acceptée / prête),
// même quand l'app est fermée / l'écran verrouillé (selon le support navigateur).
//
// Nécessite les clés VAPID en variables d'environnement :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (+ NEXT_PUBLIC_VAPID_PUBLIC_KEY côté client)
//   VAPID_SUBJECT (optionnel, ex. "mailto:contact@restaurant.be")

import webpush from "web-push";
import { prisma } from "./db";

const PUBLIC =
  process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:notifications@example.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false; // pas de clés -> push désactivé silencieusement
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToAll(subs: SubRow[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured() || subs.length === 0) return;
  const data = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (e: unknown) {
        // 404/410 = abonnement expiré côté navigateur -> on le purge.
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );
}

/** Notifie le staff d'un établissement (nouvelle commande). */
export async function notifyStaffNewOrder(
  location: string,
  payload: PushPayload,
): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({
    where: { role: "staff", location },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  await sendToAll(subs, payload);
}

/** Notifie le client qui suit une commande (par jeton). */
export async function notifyClient(
  token: string,
  payload: PushPayload,
): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({
    where: { role: "client", token },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  await sendToAll(subs, payload);
}

// --- Diagnostic / test (pour le bouton "Tester" côté staff) ---

export interface SubResult {
  kind: string; // APPLE / WINDOWS / ANDROID / OTHER
  status: number | null; // code HTTP renvoyé par le service push
  ok: boolean;
}

export interface SendDiag {
  configured: boolean; // clés VAPID présentes côté serveur ?
  subject: string; // VAPID_SUBJECT réellement utilisé (diagnostic)
  publicTail: string; // 6 derniers caractères de la clé publique (diagnostic)
  total: number; // nb d'abonnements ciblés
  sent: number; // envois réussis
  failed: number; // envois en échec
  results: SubResult[]; // détail par abonnement
}

function endpointKind(endpoint: string): string {
  if (endpoint.includes("apple")) return "APPLE";
  if (endpoint.includes("windows")) return "WINDOWS";
  if (endpoint.includes("google") || endpoint.includes("fcm")) return "ANDROID";
  return "OTHER";
}

/**
 * Envoie une notif de TEST aux abonnements staff d'un établissement et renvoie
 * un diagnostic précis (codes de retour par service push). Sert à vérifier la
 * chaîne push de bout en bout depuis le serveur de PRODUCTION :
 *   - total=0  -> aucun appareil abonné
 *   - 403/400 sur APPLE seulement -> VAPID_SUBJECT/clé invalide (Apple est strict)
 *   - 410/404  -> abonnement expiré (purgé automatiquement)
 *   - ok=true  -> la notif est partie : si rien ne s'affiche, c'est l'appareil
 */
export async function sendTestToStaff(location: string): Promise<SendDiag> {
  const diag: SendDiag = {
    configured: ensureConfigured(),
    subject: SUBJECT,
    publicTail: (PUBLIC ?? "").slice(-6),
    total: 0,
    sent: 0,
    failed: 0,
    results: [],
  };
  if (!diag.configured) return diag;

  const subs = await prisma.pushSubscription.findMany({
    where: { role: "staff", location },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  diag.total = subs.length;

  const data = JSON.stringify({
    title: "🔔 Test — SunSet Burger",
    body: "Les notifications fonctionnent. Vous serez alerté des nouvelles commandes.",
    url: "/staff",
    tag: "test",
  } satisfies PushPayload);

  await Promise.allSettled(
    subs.map(async (s) => {
      const kind = endpointKind(s.endpoint);
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
        diag.sent++;
        diag.results.push({ kind, status: r.statusCode, ok: true });
      } catch (e: unknown) {
        diag.failed++;
        const code = (e as { statusCode?: number })?.statusCode ?? null;
        diag.results.push({ kind, status: code, ok: false });
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );
  return diag;
}
