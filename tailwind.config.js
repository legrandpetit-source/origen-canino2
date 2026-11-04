/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Cromática Unificada del Logo Oficial de Origen Canino
        'primary-green': '#677333',         // Verde oliva exacto del plato y hojas
        'primary-green-light': '#7c8b3e',   // Verde oliva luminoso
        'primary-green-dark': '#4e5824',    // Verde oliva profundo
        'secondary-brown': '#3c2716',       // Café tierra cacao exacto de "CANINO"
        'secondary-brown-light': '#5c3f27', // Café tostado medio
        'primary-orange': '#db994b',        // Naranja miel de acción
        'secondary-orange': '#db994b',      // Naranja miel cálido exacto de las orejas del perrito
        'accent-red': '#c64a4c',            // Rojo salmón exacto de la carne en el tazón
        'bg-cream': '#faf7f2',              // Crema suave orgánico de fondo
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        header: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        script: ['"Outfit"', 'sans-serif'], // Unificamos script a Outfit redondeada para respetar la regla de solo 2 tipografías
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
