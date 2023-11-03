const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname,'src/**/*.{ts,tsx,html}'),
    ...createGlobPatternsForDependencies(__dirname, '/**/!(_assets_bundle|*.stories|*.spec).{tsx,jsx,js,html}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
