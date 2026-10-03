import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        disaster: {
          advisory: "#FACC15",
          moderate: "#FB923C",
          severe: "#EF4444",
          catastrophic: "#7F1D1D",
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-right': 'slideRight 0.35s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
        'count-up': 'countUp 0.4s ease-out',
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(34, 211, 238, 0.2), 0 0 30px rgba(34, 211, 238, 0.05)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.2), 0 0 30px rgba(59, 130, 246, 0.05)',
        'glow-amber': '0 0 15px rgba(251, 191, 36, 0.2), 0 0 30px rgba(251, 191, 36, 0.05)',
        'glow-emerald': '0 0 15px rgba(52, 211, 153, 0.2), 0 0 30px rgba(52, 211, 153, 0.05)',
        'glow-red': '0 0 15px rgba(248, 113, 113, 0.2), 0 0 30px rgba(248, 113, 113, 0.05)',
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.2), 0 0 30px rgba(168, 85, 247, 0.05)',
        'glow-orange': '0 0 15px rgba(251, 146, 60, 0.2), 0 0 30px rgba(251, 146, 60, 0.05)',
        'glow-indigo': '0 0 15px rgba(129, 140, 248, 0.2), 0 0 30px rgba(129, 140, 248, 0.05)',
        'glow-fuchsia': '0 0 15px rgba(232, 121, 249, 0.2), 0 0 30px rgba(232, 121, 249, 0.05)',
        'panel': '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(51, 65, 85, 0.3)',
        'panel-lg': '0 16px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(51, 65, 85, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
