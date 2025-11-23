import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1e3a5f", // Editorial Navy
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#5b7c99", // Slate Blue
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#c17d4a", // Warm Bronze
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#2d7d3e", // Forest Green
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#d97706", // Amber
          foreground: "#ffffff",
        },
        error: {
          DEFAULT: "#b91c1c", // Deep Red
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
export default config;
