/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        regal: {
          DEFAULT: '#5b2a4a',
          hover: '#47213a',
          light: '#f4ecf1',
        },
        charcoal: '#1f2328',
        surface: '#f7f7f8',
      },
    },
  },
  plugins: [],
}
