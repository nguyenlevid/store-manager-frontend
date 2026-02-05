/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      /**
       * Semantic color tokens mapped to CSS variables
       * 
       * NEVER use Tailwind's default colors (gray-100, blue-500, etc).
       * All color utilities reference our semantic tokens.
       * 
       * Usage:
       * - bg-app, bg-surface, bg-surface-subtle
       * - text-primary, text-secondary, text-muted
       * - border-default, border-subtle
       * - accent-primary, accent-success, accent-danger
       */
      colors: {
        // Background tokens
        bg: {
          app: 'var(--background-app)',
          surface: 'var(--background-surface)',
          'surface-subtle': 'var(--background-surface-subtle)',
          hover: 'var(--background-hover)',
          selected: 'var(--background-selected)',
          overlay: 'var(--background-overlay)',
        },

        // Text tokens
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          'link-hover': 'var(--text-link-hover)',
        },

        // Border tokens
        border: {
          DEFAULT: 'var(--border-default)',
          default: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },

        // Accent tokens (interactive elements)
        accent: {
          primary: 'var(--accent-primary)',
          'primary-hover': 'var(--accent-primary-hover)',
          'primary-active': 'var(--accent-primary-active)',
          'primary-subtle': 'var(--accent-primary-subtle)',

          secondary: 'var(--accent-secondary)',
          'secondary-hover': 'var(--accent-secondary-hover)',
          'secondary-active': 'var(--accent-secondary-active)',

          success: 'var(--accent-success)',
          'success-hover': 'var(--accent-success-hover)',
          'success-subtle': 'var(--accent-success-subtle)',

          warning: 'var(--accent-warning)',
          'warning-hover': 'var(--accent-warning-hover)',
          'warning-subtle': 'var(--accent-warning-subtle)',

          danger: 'var(--accent-danger)',
          'danger-hover': 'var(--accent-danger-hover)',
          'danger-subtle': 'var(--accent-danger-subtle)',
        },

        // State tokens
        state: {
          disabled: 'var(--state-disabled)',
          'disabled-text': 'var(--state-disabled-text)',
          focus: 'var(--state-focus)',
          selected: 'var(--state-selected)',
          'selected-text': 'var(--state-selected-text)',
        },

        // Status tokens (for badges, indicators)
        status: {
          'success-bg': 'var(--status-success-bg)',
          'success-text': 'var(--status-success-text)',
          'warning-bg': 'var(--status-warning-bg)',
          'warning-text': 'var(--status-warning-text)',
          'danger-bg': 'var(--status-danger-bg)',
          'danger-text': 'var(--status-danger-text)',
          'info-bg': 'var(--status-info-bg)',
          'info-text': 'var(--status-info-text)',
        },
      },

      /**
       * Ring colors for focus states
       */
      ringColor: {
        DEFAULT: 'var(--border-focus)',
        focus: 'var(--border-focus)',
      },
    },
  },
  plugins: [],
};
