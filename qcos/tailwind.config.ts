import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b8d0ff",
          300: "#8cb0ff",
          400: "#5c86ff",
          500: "#3661f5",
          600: "#2645d1",
          700: "#2038a8",
          800: "#1f3287",
          900: "#1e2e6e",
        },
        status: {
          green: "#16a34a",
          yellow: "#ca8a04",
          red: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
