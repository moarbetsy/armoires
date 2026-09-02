/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./HTML_Codes/*.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Playfair Display", "Playfair Display Fallback", "serif"],
        oswald: ["Oswald", "Oswald Fallback", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#F5F4F0",
          100: "#E7E5E0",
          200: "#C9C6B5",
          300: "#B1AA90",
          400: "#9A8E6D",
          500: "#7C7151",
          600: "#615840",
          700: "#4B432F",
          800: "#322C20",
          900: "#1F1A14",
        },
        gold: {
          50: "#FBF8F1",
          100: "#F5F0DF",
          200: "#EADFC0",
          300: "#DFCFA1",
          400: "#D4BF82",
          500: "#C9AF63",
          600: "#A18C4F",
          700: "#79693B",
          800: "#504628",
          900: "#282314",
        },
      },
    },
  },
  plugins: [],
};
