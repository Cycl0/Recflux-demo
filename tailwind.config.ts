import type { Config } from "tailwindcss";
import flowbite from "flowbite-react/tailwind";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/flowbite/**/*.js",
    flowbite.content(),
  ],
  safelist: [
    { pattern: /^grid$/ },
    { pattern: /^grid-areas-/, variants: ['2xs'] },
    { pattern: /^grid-cols-/, variants: ['2xs'] },
    { pattern: /^grid-rows-/, variants: ['2xs'] },
    { pattern: /^grid-in-/, variants: ['2xs'] }
  ],
  theme: {
     screens: {
      'xs': '380px',
      '2xs': '540px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      width: {
        100: '25rem',
        104: '26rem',
      },
      colors: {
        'blue': {  
          0: '#f0feff',
          50: '#e0fdff',
          100: '#bafbff',
          200: '#94f8ff',
          300: '#6ef5ff',
          400: '#60efff',  // Default
          500: '#00e1ff',
          600: '#00b8d4',
          700: '#0090a8',
          800: '#006b7d',
          900: '#004552',
          1000: '#002029',
        },
        'green': {  
          0: '#e6fff4',
          50: '#ccffe9',
          100: '#99ffd3',
          200: '#66ffbd',
          300: '#33ffa7',
          400: '#00ff87',  // Default
          500: '#00e67a',
          600: '#00cc6c',
          700: '#00b35e',
          800: '#009950',
          900: '#008042',
          1000: '#006634',
        },
      },
      zIndex: {
        'auto': 'auto',
        'negative': '-1',
        '0': '0',
      },
      gridTemplateAreas: {
        'inputBoxLayout': [
          '.     select select  input input',
          '.      .      button .     .    ',
          '.      .      .      files .    ',
          '.      .      .      code  code '
        ],
       'inputBoxSideLayout': [
          '.     select  select  input input',
          '.     .       button  .     .    ',
          'files files   .       .     .    ',
          'code  code    .       .     .    '
       ],
        'inputBoxMobileLayout': [
          'select select select select',
          'input  input  input  input ',
          '.      .      .      button',
          'files  files  files  files ',
          'code   code   code   code  '
        ],
      'codeSectionLayout': [
          'codeSection codeSection codeSection',
        ],
      },
      gridTemplateColumns: {
        'inputBoxLayout': '4fr 1fr 1fr 6fr 1fr',
        'inputBoxSideLayout': '4fr 1fr 1fr 6fr 1fr',
        'inputBoxMobileLayout': '2fr 2fr 7fr 2fr',
        'codeSectionLayout': 'repeat(3,1fr)',
      },
      gridTemplateRows: {
        'inputBoxLayout': `repeat(3,1fr) 600px`,
        'inputBoxSideLayout': `repeat(3,1fr) 600px`,
        'inputBoxMobileLayout': `repeat(4,1fr) 600px`,
        'codeSectionLayout': `1fr`,
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))"
      }
    }
  },
  plugins: [
    require('flowbite/plugin'),
    require('@savvywombat/tailwindcss-grid-areas'),
  ]
};
export default config;
