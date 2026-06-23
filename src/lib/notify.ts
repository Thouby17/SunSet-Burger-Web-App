"use client";

// Petits utilitaires de notification côté navigateur (son + notification système),
// partagés entre le suivi client et l'écran staff.

/** Joue un court bip (Web Audio). Sans effet si le navigateur le bloque. */
export function playBeep(durationMs = 250, frequency = 880) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => ctx.close();
  } catch {
    // audio bloqué (autoplay policy) — on ignore silencieusement
  }
}

/** Demande la permission d'afficher des notifications (si pas déjà décidé). */
export async function ensureNotifyPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

/** Affiche une notification système si l'autorisation est accordée. */
export function showNotification(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}
