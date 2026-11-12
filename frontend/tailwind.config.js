/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
    colors: { ink: "#172033", muted: "#778197", brand: "#6657e8", canvas: "#f7f8fc" },
    boxShadow: { soft: "0 12px 40px rgba(35, 42, 76, .07)" }
  }},
  plugins: []
};