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
        foreground: '#F5F7FA',
        panel: '#10151C',
        panelSecondary: '#151B23',
        card: '#10151C',
        'card-foreground': '#F5F7FA',
        popover: '#10151C',
        'popover-foreground': '#F5F7FA',
        border: '#202833',
        input: '#202833',
        ring: '#6366f1',
        primaryText: '#F5F7FA',
        secondaryText: '#94A3B8',
        muted: '#151B23',
        'muted-foreground': '#94A3B8',
        accent: '#6366f1',
        'accent-foreground': '#F5F7FA',
        destructive: '#ef4444',
        'destructive-foreground': '#F5F7FA',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    },
  },
  plugins: [],
}
