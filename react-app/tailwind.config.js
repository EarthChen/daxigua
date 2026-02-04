/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      colors: {
        'game-bg': '#f5deb3',
        'game-ground': '#8b4513',
        'game-dark': '#654321',
      },
      animation: {
        'bounce-slow': 'bounce 1.5s infinite',
        'pulse-fast': 'pulse 0.5s infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}
