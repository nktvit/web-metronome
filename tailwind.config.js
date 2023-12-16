/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    transitionDuration: {
        DEFAULT: '500ms',
    },
    extend: {
      strokeWidth: {
        'xl': '12rem',
        'lg': '8rem'
      },
      transitionDuration: {
        '300': '0.3s',
        '200': '0.2s',
      }
    }
  },
  plugins: [],
}

