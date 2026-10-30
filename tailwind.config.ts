import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--ink)",
        "bg-deep": "var(--bg-deep)",
        "bg-card": "var(--bg-card)",
        "accent-blue": "var(--accent-blue)",
        "accent-teal": "var(--accent-teal)",
        "accent-purple": "var(--accent-purple)",
        "accent-green": "var(--accent-green)",
        "accent-indigo": "var(--accent-indigo)",
      },
      fontFamily: {
        sora: ["Sora", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
