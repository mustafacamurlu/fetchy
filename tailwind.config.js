/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aki-bg': '#1a1a2e',
        'aki-sidebar': '#16213e',
        'aki-card': '#0f3460',
        'aki-accent': '#e94560',
        'aki-accent-hover': '#d63350',
        'aki-text': '#eaeaea',
        'aki-text-muted': '#a0a0a0',
        'aki-border': '#2a2a4a',
        'aki-success': '#4ade80',
        'aki-warning': '#fbbf24',
        'aki-error': '#ef4444',
        'aki-info': '#60a5fa',
      },
    },
  },
  plugins: [],
}

