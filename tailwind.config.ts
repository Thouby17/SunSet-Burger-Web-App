import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── THÈME CLAIR (façon La Merguez) ───────────────────────────────
        // Accent ambre/orangé chaud (boutons, prix, onglet actif), texte bleu
        // nuit, fonds clairs. L'échelle `neutral` (utilisée partout dans l'app)
        // est REDÉFINIE en valeurs claires pour basculer toute l'app d'un coup :
        //   - nuances BASSES (50→500) = TEXTES (foncé → gris moyen)
        //   - nuances HAUTES (600→950) = FONDS / BORDURES (gris clair → blanc)
        brand: {
          DEFAULT: "#ff6b35", // orange coucher de soleil SunSet (boutons, états actifs)
          dark: "#e65100",
        },
        gold: {
          DEFAULT: "#b45309", // ambre profond, LISIBLE en texte sur fond clair (prix)
          dark: "#92400e",
        },
        neutral: {
          50: "#0a0f1a",
          100: "#0f172a", // texte principal (bleu nuit quasi noir)
          200: "#1e293b", // texte fort
          300: "#334155", // texte sur boutons gris clair
          400: "#475569", // texte secondaire (bien lisible)
          500: "#64748b", // légendes / texte discret
          600: "#cbd5e1", // bordures, puces décoratives
          700: "#dde3ea", // boutons secondaires, boutons +/- quantité
          800: "#e9edf2", // champs, pastilles inactives, séparateurs
          900: "#ffffff", // cartes (blanc)
          950: "#ffffff", // barres de nav, texte sur boutons accent
        },
      },
      fontFamily: {
        // Serif éditorial (Playfair Display) pour les titres = ADN "menu de resto".
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Pulse du compteur panier quand un article est ajouté (feedback "ajouté").
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "sheet-up": "sheet-up 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        "modal-in": "modal-in 180ms ease-out",
        pop: "pop 300ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
