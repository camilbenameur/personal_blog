/** @type {import('tailwindcss').Config} */
// Preflight stays off: the shared reset lives in src/styles/base.css. Every value is a design token
// from src/styles/tokens.css, so a utility follows the theme (dark, light, system) without a `dark:` variant.
export default {
  content: ['./src/**/*.{astro,html,js,md,mdx,ts}'],
  corePlugins: { preflight: false },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      panel: 'var(--panel)',
      bar: 'var(--bar)',
      raised: 'var(--raised)',
      fg: 'var(--fg)',
      text2: 'var(--text-2)',
      muted: 'var(--muted)',
      code: 'var(--code-bg)',
      hairline: 'var(--hairline)',
      strong: 'var(--border-strong)',
      danger: 'var(--danger)',
      accent: 'var(--accent)',
      'accent-hover': 'var(--accent-hover)',
      path: 'var(--path)',
    },
    fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.55' }],
      base: ['1rem', { lineHeight: '1.65' }],
      lg: ['1.125rem', { lineHeight: '1.5' }],
      xl: ['1.375rem', { lineHeight: '1.25' }],
      display: ['var(--fs-display)', { lineHeight: '1.02' }],
    },
    borderRadius: { none: '0', win: 'var(--r-win)', btn: 'var(--r-btn)', chip: 'var(--r-chip)' },
    boxShadow: { none: 'none', win: 'var(--shadow-win)', 1: 'var(--shadow-1)', 2: 'var(--shadow-2)' },
    extend: { maxWidth: { frame: 'var(--frame)', measure: 'var(--measure)', prose: 'var(--measure-prose)' } },
  },
  plugins: [],
};
