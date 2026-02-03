/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1200px'
      }
    },
    extend: {
      colors: {
        'rich-cerulean': {
          50: '#ecf2f8',
          100: '#d9e6f2',
          200: '#b4cce4',
          300: '#8eb2d7',
          400: '#6899ca',
          500: '#427fbd',
          600: '#356697',
          700: '#284c71',
          800: '#1b334b',
          900: '#0d1926',
          950: '#09121a'
        },
        'cobalt-blue': {
          50: '#e5f1ff',
          100: '#cce3ff',
          200: '#99c7ff',
          300: '#66abff',
          400: '#338fff',
          500: '#0073ff',
          600: '#005ccc',
          700: '#004599',
          800: '#002e66',
          900: '#001733',
          950: '#001024'
        },
        'iron-grey': {
          50: '#f1f2f4',
          100: '#e3e6e8',
          200: '#c7ccd1',
          300: '#abb3ba',
          400: '#8f99a3',
          500: '#737f8c',
          600: '#5c6670',
          700: '#454c54',
          800: '#2e3338',
          900: '#17191c',
          950: '#101214'
        },
        'shadow-grey': {
          50: '#f1f2f3',
          100: '#e3e5e8',
          200: '#c7cbd1',
          300: '#acb2b9',
          400: '#9098a2',
          500: '#747e8b',
          600: '#5d656f',
          700: '#464c53',
          800: '#2e3238',
          900: '#17191c',
          950: '#101213'
        },
        black: {
          50: '#f0f0f5',
          100: '#e1e1ea',
          200: '#c3c3d5',
          300: '#a5a5c0',
          400: '#8787ab',
          500: '#696996',
          600: '#545478',
          700: '#3f3f5a',
          800: '#2a2a3c',
          900: '#15151e',
          950: '#0f0f15'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
