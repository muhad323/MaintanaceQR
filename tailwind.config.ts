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
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
        },
        secondary: "var(--color-secondary)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        accent: "var(--color-accent)",
        sand: "var(--color-sand)",
        border: "var(--color-border)",
        status: {
          done: "var(--color-done)",
          doneBg: "var(--color-done-bg)",
          pending: "var(--color-pending)",
          pendingBg: "var(--color-pending-bg)",
          issue: "var(--color-issue)",
          issueBg: "var(--color-issue-bg)",
        },
      },
      fontFamily: {
        brand: ["var(--font-brand)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
