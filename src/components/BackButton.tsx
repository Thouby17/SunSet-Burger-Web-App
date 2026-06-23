"use client";

// Bouton retour : une flèche vers la gauche qui revient à l'écran précédent.
// À placer en haut à gauche des sous-pages.

import { useRouter } from "next/navigation";

export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  function goBack() {
    // Si on a un historique, on revient ; sinon on va sur la page de repli.
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      onClick={goBack}
      aria-label="Retour"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-neutral-200 transition active:scale-90 hover:bg-neutral-700"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
