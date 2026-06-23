import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette "SunSet" : fond sombre, accent orange coucher de soleil.
        brand: {
          DEFAULT: "#ff6b35",
          dark: "#e65100",
        },
      },
    },
  },
  plugins: [],
};

export default config;
