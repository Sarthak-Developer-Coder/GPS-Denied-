/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#05060d",
          900: "#0a0e1a",
          850: "#0d1220",
          800: "#111827",
          700: "#1a2236",
          600: "#232d47",
          500: "#2f3b5c",
        },
        accent: {
          400: "#5eead4",
          500: "#22d3ee",
          600: "#06b6d4",
          purple: "#a78bfa",
          pink: "#f472b6",
        },
        status: {
          pass: "#34d399",
          fail: "#f87171",
          warn: "#fbbf24",
          info: "#60a5fa",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,234,212,0.15), 0 0 24px rgba(34,211,238,0.15)",
        card: "0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        "aurora": "radial-gradient(60% 60% at 20% 10%, rgba(34,211,238,0.15) 0%, rgba(0,0,0,0) 60%), radial-gradient(50% 50% at 90% 20%, rgba(167,139,250,0.14) 0%, rgba(0,0,0,0) 60%)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
