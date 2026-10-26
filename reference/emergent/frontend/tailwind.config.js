/** @type {import('tailwindcss').Config} */
module.exports = {
  blocklist: ["overline"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#09332A", mid: "#0F4438" },
        brand: { 50: "#EBF6F3", 100: "#CFEDE6", 200: "#A3DCCF", 500: "#169A82", 600: "#11816D", 700: "#0E6B5A" },
        mango: { DEFAULT: "#FED262", deep: "#F9C143" },
        cream: "#FEFDF8",
      },
      fontFamily: {
        sans: ['"Noto Sans Bengali"', '"Hind Siliguri"', "system-ui", "sans-serif"],
      },
      lineHeight: { bn: "1.7" },
      boxShadow: { card: "0 1px 2px rgba(9,51,42,0.06), 0 4px 16px -8px rgba(9,51,42,0.12)" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        sheet: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        rise: "rise 220ms ease-out both",
        sheet: "sheet 220ms ease-out both",
        fade: "fade 150ms ease-out both",
      },
    },
  },
  plugins: [],
};
