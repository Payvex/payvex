import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores Identidade Payvex
        brand: {
          blue: "#3A416F", // Azul Marinho (Seriedade)
          green: "#82d616", // Verde (Ação/Dinheiro)
          light: "#F8F9FA", // Cinza claro para fundos
        },
      },
    },
  },
  plugins: [],
};
export default config;
