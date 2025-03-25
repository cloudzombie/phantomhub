/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(240 5.9% 20%)",
        input: "hsl(240 3.7% 15.9%)",
        ring: "hsl(142.1 70.6% 45.3%)",
        background: "hsl(240 10% 10%)",
        foreground: "hsl(0 0% 95%)",
        
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#A78BFA', // Primary purple
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        accent: {
          50: '#E6F0FF',
          100: '#B2DBFF',
          200: '#81C6FF',
          300: '#4FB0FF',
          400: '#38A0FF',
          500: '#0575E6', // Primary electric blue
          600: '#2C6EAA',
          700: '#28548A',
          800: '#233F75',
          900: '#1D3160',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9', 
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb', 
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563', 
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        dark: '#111921', // Dark background
        darker: '#0A1017', // Even darker background
        'gray-850': '#1A202C', // Slightly lighter dark background
        primary: {
          DEFAULT: "hsl(142.1 70.6% 45.3%)",
          foreground: "hsl(144.9 80.4% 10%)",
          50: "#e5fbef",
          100: "#c1f5d7",
          200: "#8aedb5",
          300: "#6de7a8",
          400: "#24d671",
          500: "#00c555",
          600: "#00a344",
          700: "#00893a",
          800: "#006e2f",
          900: "#004a1f",
          950: "#003215",
        },
        secondary: {
          DEFAULT: "hsl(240 3.7% 15.9%)",
          foreground: "hsl(0 0% 98%)",
          50: "#f5f5f6",
          100: "#e5e5e9",
          200: "#cbccd3",
          300: "#a6a9b7",
          400: "#7c7e93",
          500: "#5d6078",
          600: "#4c4d62",
          700: "#3f3f50",
          800: "#363644",
          900: "#30303a",
          950: "#1b1b21",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(0 0% 98%)",
        },
        muted: {
          DEFAULT: "hsl(240 3.7% 15.9%)",
          foreground: "hsl(240 5% 64.9%)",
        },
        card: {
          DEFAULT: "hsl(240 10% 14%)",
          foreground: "hsl(0 0% 95%)",
        },
        popover: {
          DEFAULT: "hsl(240 10% 14%)",
          foreground: "hsl(0 0% 95%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        'neon': '0 0 5px theme("colors.brand.500"), 0 0 20px rgba(167, 139, 250, 0.3)',
        'neon-lg': '0 0 10px theme("colors.brand.500"), 0 0 30px rgba(167, 139, 250, 0.5)',
        'accent': '0 0 5px theme("colors.accent.500"), 0 0 20px rgba(5, 117, 230, 0.3)',
        'glow': '0 0 20px rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 #A78BFA, 0 0 #A78BFA, 0 0 #A78BFA, 0 0 #A78BFA' },
          '50%': { boxShadow: '0 0 10px #A78BFA, 0 0 20px #A78BFA, 0 0 30px #A78BFA, 0 0 40px #A78BFA' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("tailwindcss-animate"),
  ],
} 