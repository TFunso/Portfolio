import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9f3",
          100: "#d7f0e2",
          500: "#1a9c5c",
          600: "#158049",
          700: "#116339",
        },
      },
    },
  },
  plugins: [],
};

export default config;
