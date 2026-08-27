/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-green': '#5f992f',
        'primary-green-light': '#7cb84a',
        'primary-green-dark': '#3a6b1c',
        'secondary-brown': '#2e1e14',
        'secondary-brown-light': '#5e4334',
        'secondary-orange': '#e56c32',
        'bg-cream': '#fcf9f2',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        header: ['Fredoka', 'sans-serif'],
        script: ['Pacifico', 'cursive'],
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
}

