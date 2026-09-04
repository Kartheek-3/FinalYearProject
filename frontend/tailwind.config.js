/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F14',
        panel: '#10151C',
        panelSecondary: '#151B23',
        border: '#202833',
        primaryText: '#F5F7FA',
        secondaryText: '#94A3B8',
        accent: '#6366f1',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    },
  },
  plugins: [],
}
