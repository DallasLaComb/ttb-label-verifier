/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'ttb-navy': '#0A244D',
        'ttb-gold': '#F6AF20',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
