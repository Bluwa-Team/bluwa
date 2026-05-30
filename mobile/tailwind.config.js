/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bluwa: {
          50: "#E6F4FE",
          100: "#CCE9FD",
          200: "#99D3FB",
          300: "#66BDF9",
          400: "#33A7F7",
          500: "#0091F5",
          600: "#0074C4",
          700: "#005793",
          800: "#003A62",
          900: "#001D31",
        },
      },
    },
  },
  plugins: [],
};
