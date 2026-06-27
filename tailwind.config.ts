import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "oklch(16% 0.018 245)",
        paper: "oklch(97% 0.006 248)",
        panel: "oklch(99.2% 0.002 250)",
        line: "oklch(85% 0.014 250)",
        muted: "oklch(45% 0.026 250)",
        signal: "oklch(62% 0.16 205)",
        cobalt: "oklch(42% 0.095 258)",
        amber: "oklch(74% 0.148 82)",
        rose: "oklch(58% 0.17 23)"
      },
      boxShadow: {
        soft: "0 18px 44px rgb(20 24 36 / 0.08)",
        diffusion: "0 30px 80px -42px rgb(16 21 34 / 0.3)"
      }
    }
  },
  plugins: []
};

export default config;
