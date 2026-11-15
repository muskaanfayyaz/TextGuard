/** @type {import('tailwindcss').Config} */
const amber = {
  50: '#FFF4E4',
  100: '#FFE6C2',
  200: '#FFD08A',
  300: '#FFBB5C',
  400: '#FFAA3D',
  500: '#FF9E20',
  600: '#FF9E20',
  700: '#E88A12',
  800: '#B96B0B',
  900: '#874D08',
  950: '#4A2904'
};
const teal = {
  50: '#EAF2F1',
  100: '#D4E5E3',
  200: '#B0D0CD',
  300: '#83B2AE',
  400: '#55918D',
  500: '#357874',
  600: '#215E61',
  700: '#194B4E',
  800: '#153B3E',
  900: '#102D30',
  950: '#091B1D'
};
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: amber,
        amber,
        violet: teal,
        blue: teal,
        purple: teal
      }
    }
  },
  plugins: []
};
