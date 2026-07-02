// Animation "vol vers le panier" : quand un plat est ajouté, une petite pastille
// part de l'endroit de l'ajout et file (en arc) vers l'icône panier visible de la
// barre de navigation — feedback fort + ça montre OÙ se trouve le panier.
// Pattern classique e-commerce (Amazon, Zalando…). Respecte reduced-motion.

const TARGET_SELECTOR = "[data-cart-target]";

function centerOf(rect: { left: number; top: number; width: number; height: number }) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Cible = l'icône panier de la nav actuellement VISIBLE (top sur desktop, bottom sur mobile). */
function visibleTarget(): HTMLElement | null {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(TARGET_SELECTOR),
  );
  return els.find((el) => el.offsetParent !== null) ?? els[0] ?? null;
}

export function flyToCart(source: HTMLElement | DOMRect): void {
  if (typeof window === "undefined") return;
  // Respecte la préférence "réduire les animations".
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const target = visibleTarget();
  if (!target) return;

  const srcRect = source instanceof HTMLElement ? source.getBoundingClientRect() : source;
  const from = centerOf(srcRect);
  const to = centerOf(target.getBoundingClientRect());

  // Pastille volante (couleur de marque Brooklyn), positionnée en fixed.
  const dot = document.createElement("div");
  dot.setAttribute("aria-hidden", "true");
  Object.assign(dot.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "20px",
    height: "20px",
    borderRadius: "9999px",
    background: "#e8730c",
    boxShadow: "0 4px 14px rgba(232,115,12,0.5)",
    zIndex: "100",
    pointerEvents: "none",
    willChange: "transform, opacity",
  });
  document.body.appendChild(dot);

  // Arc : point de contrôle au-dessus du trajet (effet "lob").
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 80;
  const offset = (x: number, y: number) =>
    `translate(${x - 10}px, ${y - 10}px)`;

  const anim = dot.animate(
    [
      { transform: `${offset(from.x, from.y)} scale(1)`, opacity: 1 },
      { transform: `${offset(midX, midY)} scale(1.15)`, opacity: 1, offset: 0.5 },
      { transform: `${offset(to.x, to.y)} scale(0.3)`, opacity: 0.5 },
    ],
    { duration: 650, easing: "cubic-bezier(0.5, 0, 0.5, 1)" },
  );

  anim.onfinish = () => {
    dot.remove();
    // Petit rebond de l'icône panier à l'arrivée.
    target.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.3)" },
        { transform: "scale(1)" },
      ],
      { duration: 300, easing: "ease-out" },
    );
  };
}
