/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Financial custom palette
        fin: {
          long: "hsl(142 76% 45%)",
          short: "hsl(0 72% 51%)",
          neutral: "hsl(215 20% 55%)",
          cyan: "hsl(199 89% 48%)",
          violet: "hsl(263 70% 60%)",
          amber: "hsl(38 92% 50%)",
          surface1: "hsl(222 44% 8%)",
          surface2: "hsl(222 40% 11%)",
          surface3: "hsl(222 35% 14%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "from": { backgroundPosition: "-200% center" },
          "to": { backgroundPosition: "200% center" },
        },
        "dot-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.34,1.2,0.64,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "dot-pulse": "dot-pulse 1.5s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px hsla(199,89%,48%,0.35), 0 0 60px hsla(199,89%,48%,0.15)",
        "glow-violet": "0 0 20px hsla(263,70%,60%,0.35), 0 0 60px hsla(263,70%,60%,0.15)",
        "glow-green": "0 0 20px hsla(142,76%,45%,0.35), 0 0 60px hsla(142,76%,45%,0.15)",
        "glow-red": "0 0 20px hsla(0,72%,51%,0.35), 0 0 60px hsla(0,72%,51%,0.15)",
        "card": "0 4px 24px hsla(222,47%,3%,0.5), 0 0 0 1px hsla(210,40%,96%,0.05)",
        "card-hover": "0 8px 32px hsla(222,47%,3%,0.7), 0 0 0 1px hsla(199,89%,48%,0.25)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "fin-gradient": "linear-gradient(135deg, hsl(199,89%,48%), hsl(263,70%,60%))",
        "long-gradient": "linear-gradient(135deg, hsl(142,76%,40%), hsl(172,76%,45%))",
        "short-gradient": "linear-gradient(135deg, hsl(0,72%,45%), hsl(15,72%,50%))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}