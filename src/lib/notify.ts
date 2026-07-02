"use client";

// Utilitaires de notification cote navigateur (son + vibration).
//
// ⚠️ iOS Safari LIMITE le nombre d'AudioContext simultanes (~4) et CRASHE la page
// au-dela ("Hardware AudioContext limit reached"). On utilise donc UN SEUL
// AudioContext partage, reutilise pour tous les bips : seuls des OscillatorNode
// (illimites, tres legers) sont crees a chaque bip. Le contexte est debloque au
// 1er geste utilisateur (les navigateurs bloquent l'audio tant qu'on n'a pas
// interagi) — voir unlockAudio().

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!_ctx) _ctx = new Ctx();
    if (_ctx.state === "suspended") void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

/** Debloque l'audio (a appeler depuis un geste utilisateur : clic, touche). */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

/**
 * Le contexte audio est-il RÉELLEMENT débloqué (état "running") ?
 * ⚠️ `ctx.resume()` appelé HORS d'un geste utilisateur direct (ex. depuis un
 * `setInterval` de polling ou une alarme) peut échouer SILENCIEUSEMENT sur iOS
 * Safari : le contexte reste "suspended" et aucun son n'est audible, sans la
 * moindre erreur. Cette fonction sert à détecter ce cas pour prévenir l'écran
 * staff (bannière "touchez l'écran pour activer le son").
 */
export function isAudioUnlocked(): boolean {
  return _ctx !== null && _ctx.state === "running";
}

/**
 * Joue un bip court sur le contexte audio PARTAGE (aucun nouvel AudioContext).
 * `volume` entre 0 et 1.
 */
export function playBeep(durationMs = 250, frequency = 880, volume = 0.6) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    const start = ctx.currentTime;
    const end = start + durationMs / 1000;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end); // fondu de sortie
    osc.start(start);
    osc.stop(end);
    // ⚠️ on NE ferme PAS le contexte : il est partage et reutilise.
  } catch {
    // audio bloque (autoplay policy) — on ignore silencieusement
  }
}

/** Fait vibrer l'appareil si supporte (mobile). Sans effet sur iOS Safari. */
export function vibrate(pattern: number | number[] = [200, 100, 200]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/**
 * Alerte "nouvelle commande" (ecran staff) : carillon fort et insistant sur ~4 s.
 * Tous les bips passent par le contexte partage -> aucun risque de crash iOS.
 */
export function alertNewOrder() {
  const tones: [number, number][] = [
    [0, 660],
    [200, 880],
    [400, 1175],
  ];
  const ROUNDS = 5;
  const GAP = 850; // ms entre deux carillons
  for (let r = 0; r < ROUNDS; r++) {
    for (const [offset, freq] of tones) {
      setTimeout(() => playBeep(270, freq, 0.8), r * GAP + offset);
    }
  }
  vibrate([400, 200, 400, 200, 600, 200, 400]);
}

// --- Alarme "nouvelle commande" en BOUCLE (ecran staff ouvert) ---
// iOS interdit un son personnalise sur les notifications push en arriere-plan ;
// le seul endroit ou l'on controle le son est l'app OUVERTE. On y joue donc une
// alarme forte et repetee jusqu'a ce que le staff touche l'ecran (acquittement),
// avec une coupure de securite pour ne pas sonner indefiniment.

let _alarmInterval: ReturnType<typeof setInterval> | null = null;
let _alarmTimeout: ReturnType<typeof setTimeout> | null = null;

/** Demarre l'alarme repetee. S'arrete a `stopAlarm()` ou apres `maxMs`. */
export function startAlarm(maxMs = 45000) {
  stopAlarm();
  const ring = () => {
    // Deux tons aigus et forts = "alarme" bien reconnaissable.
    playBeep(260, 988, 0.9);
    setTimeout(() => playBeep(320, 1319, 0.9), 280);
    vibrate([300, 120, 300]);
  };
  ring();
  _alarmInterval = setInterval(ring, 1300);
  _alarmTimeout = setTimeout(stopAlarm, maxMs);
}

/** Arrete l'alarme (acquittement staff, ou coupure de securite). */
export function stopAlarm() {
  if (_alarmInterval) {
    clearInterval(_alarmInterval);
    _alarmInterval = null;
  }
  if (_alarmTimeout) {
    clearTimeout(_alarmTimeout);
    _alarmTimeout = null;
  }
}

/**
 * Alerte "mise a jour de commande" (client, ex. commande prete) : carillon doux.
 */
export function alertOrderUpdate() {
  playBeep(280, 880, 0.22);
  setTimeout(() => playBeep(320, 1175, 0.22), 220);
  vibrate([250, 120, 250]);
}

/** Demande la permission d'afficher des notifications (si pas deja decide). */
export async function ensureNotifyPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Affiche une notification systeme si l'autorisation est accordee.
 */
export function showNotification(
  title: string,
  body: string,
  vibratePattern: number[] = [250, 120, 250],
) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, vibrate: vibratePattern } as NotificationOptions);
    }
  } catch {
    /* ignore */
  }
}
