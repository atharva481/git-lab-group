/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'charcoal': '#1e1e1e',
        'dark-card': '#2c2f33',
        'light-gray': '#e0e0e0',
        'soft-red': '#ff6b6b',
        'cool-blue': '#4dabf7',
      },
    },
  },
  plugins: [],
}