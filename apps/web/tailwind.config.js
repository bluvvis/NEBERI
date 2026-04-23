/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        /** Чуть крупнее базовый текст для читаемости. */
        sm: ["0.9375rem", { lineHeight: "1.5" }],
        base: ["1.0625rem", { lineHeight: "1.55" }],
        lg: ["1.1875rem", { lineHeight: "1.45" }],
        xl: ["1.3125rem", { lineHeight: "1.4" }],
        "2xl": ["1.5rem", { lineHeight: "1.35" }],
        "3xl": ["1.875rem", { lineHeight: "1.25" }],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translate(-50%, 16px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
        },
        "list-row": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "score-pop": {
          "0%": { opacity: "0.65", transform: "scale(0.88)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "risk-high-ring": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.92", filter: "brightness(1.06)" },
        },
        "risk-high-sheen": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "shell-enter": {
          "0%": { opacity: "0", transform: "translate3d(0,14px,0) scale(0.992)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0) scale(1)" },
        },
        "shell-header-line": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s ease-out both",
        "toast-in": "toast-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "list-row": "list-row 0.42s ease-out both",
        "score-pop": "score-pop 0.48s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 1.7s ease-in-out infinite",
        "risk-high-ring": "risk-high-ring 2.4s ease-in-out infinite",
        "risk-high-sheen": "risk-high-sheen 4s ease-in-out infinite",
        "shell-enter": "shell-enter 0.48s cubic-bezier(0.22, 1, 0.36, 1) both",
        "shell-header-line": "shell-header-line 5s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        /** Тот же основной шрифт + табличные цифры (без третьей гарнитуры в UI). */
        mono: ["Inter", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        brand: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          red: "#FF0032",
          surface: "#F2F3F7",
          ink: "#1D2023",
          muted: "#5C6169",
          line: "#D7DADF",
          "zone-low": "#C4CAD3",
          "zone-mid": "#8E949E",
          "zone-high": "#FF0032",
          card: "#FFFFFF",
          panel: "#25282C",
          "panel-border": "#35393E",
        },
        ink: { 950: "#07090f", 900: "#0c1019", 800: "#141a26" },
        /** Для совместимости с будущими компонентами — high = тот же акцент, что brand.red. */
        signal: { low: "#22c55e", mid: "#eab308", high: "#FF0032", glow: "#38bdf8" },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(29,32,35,0.08), 0 20px 40px -16px rgba(0,0,0,0.2)",
        "panel-light":
          "0 0 0 1px rgba(29,32,35,0.06), 0 12px 32px -12px rgba(29,32,35,0.12)",
        /** Кнопки и акценты — rgba от #FF0032 (255,0,50). */
        "brand-btn": "0 8px 24px -8px rgba(255, 0, 50, 0.28)",
        "brand-ring-glow": "0 0 18px -4px rgba(255, 0, 50, 0.45)",
      },
    },
  },
  plugins: [],
};
