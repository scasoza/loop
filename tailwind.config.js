/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0f0a1f',
        surface: '#1a1230',
        panel: '#1e1638',
        accent: '#7dd3a8',
        success: '#7dd3a8',
        warning: '#f5b17a',
        danger: '#f58b7a',
        coral: '#f58b7a',
        lavender: '#a882ff',
        cream: '#faf7f2'
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px'
      }
    }
  },
  plugins: []
};
