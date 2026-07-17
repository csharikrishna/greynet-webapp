import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0C0E",
        panel: "#12161A",
        line: "#232A30",
        paper: "#E9EDEE",
        dim: "#8B979C",
        signal: "#3ED9C4",
        warn: "#E8A24B",
        alert: "#E0654F",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at center, transparent 0%, #0A0C0E 70%)',
      },
    },
  },
  plugins: [],
};
export default config;
