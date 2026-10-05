/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefce8',   // faint pale yellow
          100: '#fef9c3',  // soft light yellow
          200: '#fef08a',  // mild warm yellow
          300: '#fde047',  // golden accent yellow
          400: '#facc15',  // vibrant yellow
          500: '#eab308',  // primary hardware yellow
          600: '#ca8a04',  // rich amber gold
          700: '#a16207',  // deep warm bronze
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        faint: {
          50: '#fffdf2',   // pleasant faint yellow canvas
          100: '#fefce8',  // pale yellow surface
          200: '#fef9c3',  // light yellow border
          300: '#fef08a',
        },
        slate: {
          850: '#151f30',
        }
      },
    },
  },
  plugins: [],
}
