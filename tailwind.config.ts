import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme base colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Custom dark theme palette
        dark: {
          50: '#0a0a0a',
          100: '#111111',
          200: '#1a1a1a',
          300: '#262626',
          400: '#333333',
          500: '#404040',
          600: '#525252',
          700: '#666666',
          800: '#808080',
          900: '#a3a3a3',
        },
        
        // Neon accent colors
        neon: {
          cyan: '#00ffff',
          'cyan-glow': '#00ffff80',
          violet: '#8b5cf6',
          'violet-glow': '#8b5cf680',
          pink: '#ec4899',
          'pink-glow': '#ec489980',
          green: '#10b981',
          'green-glow': '#10b98180',
        },
        
        // Glassmorphism colors
        glass: {
          'dark': 'rgba(26, 26, 26, 0.8)',
          'darker': 'rgba(17, 17, 17, 0.9)',
          'border': 'rgba(255, 255, 255, 0.1)',
          'border-hover': 'rgba(255, 255, 255, 0.2)',
        }
      },
      
      // Custom backdrop blur utilities
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      
      // Custom animations for micro-interactions
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.8)',
          },
        },
        'slide-in-up': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'slide-in-down': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'scale-in': {
          '0%': {
            transform: 'scale(0.95)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      
      // Mobile-first responsive breakpoints
      screens: {
        'xs': '360px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
export default config;