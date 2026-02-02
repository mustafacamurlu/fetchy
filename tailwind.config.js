/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic theme colors - these work with both light and dark modes
        'aki-bg': 'var(--bg-color, #1a1a2e)',
        'aki-sidebar': 'var(--sidebar-color, #16213e)',
        'aki-card': 'var(--card-color, #0f3460)',
        'aki-accent': 'var(--accent, #e94560)',
        'aki-accent-hover': 'var(--accent-hover, #d63350)',
        'aki-text': 'var(--text-color, #eaeaea)',
        'aki-text-muted': 'var(--text-muted, #a0a0a0)',
        'aki-border': 'var(--border-color, #2a2a4a)',
        'aki-success': '#4ade80',
        'aki-warning': '#fbbf24',
        'aki-error': '#ef4444',
        'aki-info': '#60a5fa',

        // Light mode specific colors (fallback)
        'aki-bg-light': '#e8eaed',
        'aki-sidebar-light': '#f0f2f5',
        'aki-card-light': '#f5f6f8',
        'aki-accent-light': '#c93850',
        'aki-accent-hover-light': '#b52d45',
        'aki-text-light': '#2a2a2a',
        'aki-text-muted-light': '#5a5f66',
        'aki-border-light': '#d0d4d8',
        'aki-success-light': '#1ea654',
        'aki-warning-light': '#dc8c0d',
        'aki-error-light': '#d63f3f',
        'aki-info-light': '#3070d6',
      },
    },
  },
  plugins: [],
}



