/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a10",
        surface: "#14141c",
        brand: { 400: "#a855f7", 500: "#8b3df0", 600: "#7c3aed" },
        glow: { violet: "#4c2a8a", magenta: "#7a2a7a" },
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(ellipse at top, #4c2a8a 0%, #2a1550 40%, #0a0a10 80%)",
        "btn-brand": "linear-gradient(90deg, #7c3aed, #a855f7)",
        "text-accent": "linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b)",
      },
      boxShadow: { glow: "0 10px 30px -5px rgba(139,61,240,0.5)" },
      borderRadius: { "4xl": "2rem" },
      fontFamily: { sans: ['"Plus Jakarta Sans"', "sans-serif"] },
    },
  },
  plugins: [],
};