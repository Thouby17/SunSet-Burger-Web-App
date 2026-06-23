import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette "Brooklyn" : fond sombre, accent jaune/ambre street food.
        brand: {
          DEFAULT: "#f5b301",
          dark: "#d99a00",
        },
      },
    },
  },
  plugins: [],
};

export default config;
