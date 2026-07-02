"use client";

// Écran de démarrage (splash) : au lancement de l'app, on affiche le logo en
// grand sur fond sombre le temps que l'interface se charge, puis fondu de sortie.
//
// IMPORTANT : l'état initial est "shown" pour que l'overlay soit présent dès le
// rendu serveur (HTML initial) → le logo apparaît IMMÉDIATEMENT, sans écran noir
// avant l'hydratation. L'effet ne fait que programmer la disparition.

import { useEffect, useState } from "react";

const VISIBLE_MS = 1300; // durée d'affichage pleine opacité
const FADE_MS = 500; // durée du fondu de sortie

export default function SplashScreen({ restaurantName = "" }: { restaurantName?: string }) {
  const [phase, setPhase] = useState<"shown" | "fading" | "hidden">("shown");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fading"), VISIBLE_MS);
    const removeTimer = setTimeout(() => setPhase("hidden"), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 transition-opacity duration-500 ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={restaurantName}
        fetchPriority="high"
        className="h-48 w-48 animate-pulse rounded-3xl object-contain shadow-2xl sm:h-56 sm:w-56"
      />
    </div>
  );
}
