"use client";

// Abonnement Web Push côté navigateur : enregistre le service worker, demande
// la permission, s'abonne au PushManager et envoie l'abonnement au serveur.
// À appeler suite à un geste utilisateur (staff : bouton son ; client : arrivée
// sur la page de suivi). Sans effet si le navigateur ne supporte pas le push
// (ex. iOS hors PWA installée) ou si la clé VAPID publique n'est pas configurée.

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Convertit la clé VAPID base64url en Uint8Array (format attendu par subscribe). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface EnablePushOptions {
  role: "staff" | "client";
  location?: string;
  token?: string;
}

/** Active les notifications push. Renvoie true si l'abonnement a réussi. */
export async function enablePush(opts: EnablePushOptions): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      !VAPID_PUBLIC
    ) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
    }

    const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: json.keys,
        role: opts.role,
        location: opts.location ?? null,
        token: opts.token ?? null,
      }),
    });
    return true;
  } catch {
    return false;
  }
}
