import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body:    ["var(--font-space)", "system-ui", "sans-serif"],
      },
      colors: {
        cream:  "#F7F4EF",
        ink:    "#0E0E0E",
        muted:  "#888888",
        rule:   "#D8D3CB",
        red:    "#C8372D",
      },
    },
  },
  plugins: [],
};

export default config;
