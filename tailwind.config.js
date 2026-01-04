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
        midnight: '#0c1626',
        surface: '#0f1c2f',
        panel: '#13233b',
        accent: '#1ea7ff',
        success: '#3ae58d',
        warning: '#ff9f43',
        danger: '#ff4d4f'
      }
    }
  },
  plugins: []
};
