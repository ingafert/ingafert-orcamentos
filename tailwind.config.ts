import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ingafert: {
          verde: "#2E5E3E",
          "verde-escuro": "#1F4229",
          "verde-claro": "#4A7F5C",
          ouro: "#D4AF37",
          "ouro-claro": "#E6C767",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(46,94,62,0.08)",
        "card-hover": "0 8px 24px rgba(46,94,62,0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
