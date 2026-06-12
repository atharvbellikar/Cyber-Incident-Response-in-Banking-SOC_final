import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        background: "#0f172a",
        surface: "#1e293b",
        border: "#334155",
        textPrimary: "#cbd5f5",
        textMuted: "#64748b",
        critical: "#ef4444",
        high: "#f97316",
        medium: "#3b82f6",
        low: "#10b981",
      },
    },
  },
};

export default config;