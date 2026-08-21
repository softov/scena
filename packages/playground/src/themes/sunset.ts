import type { ThemeDefinition } from '@softov/scena/styles';

// Sunset — registered as a pure tokens-object theme. Exercises the
// `{ kind: 'tokens' }` branch of applyTheme (no CSS file shipped).
export const sunsetTheme: ThemeDefinition = {
  id: 'sunset',
  label: 'Sunset',
  variants: {
    light: {
      kind: 'tokens',
      tokens: {
        '--oo-color-canvas': '#fff7ed',
        '--oo-color-text': '#431407',
        '--oo-color-muted': '#9a3412',
        '--oo-color-accent': '#ea580c',
        '--oo-color-line': '#fdba74',
        '--oo-color-border': '#fed7aa',
        '--oo-color-surface': '#ffedd5',
        '--oo-color-surface-hover': '#fdba74',
        '--oo-color-surface-active': '#fdba74',
        '--oo-color-primary': '#ea580c',
        '--oo-color-active': '#fdba74',
        '--oo-color-danger': '#b91c1c',
        '--oo-color-success': '#15803d',
        '--oo-color-warning': '#a16207',

        '--oo-sidebar-left-bg': '#ffedd5',
        '--oo-sidebar-left-fg': '#431407',
        '--oo-sidebar-right-bg': '#ffedd5',
        '--oo-sidebar-right-fg': '#431407',

        '--oo-scrollbar-track-color': 'transparent',
        '--oo-scrollbar-thumb-color': 'var(--oo-color-border)',
        '--oo-scrollbar-border-color': 'var(--oo-color-border)',
        '--oo-scrollbar-thumb-hover': 'var(--oo-color-active)',

        '--oo-activitybar-bg': '#ffedd5',
        '--oo-activitybar-fg': '#7c2d12',
        '--oo-activitybar-fg-hover': '#431407',
        '--oo-activitybar-bg-hover': '#fdba74',
        '--oo-activitybar-fg-active': '#c2410c',
        '--oo-activitybar-bg-active': '#fdba74',
      },
    },
    dark: {
      kind: 'tokens',
      tokens: {
        '--oo-color-canvas': '#1c0a02',
        '--oo-color-text': '#fed7aa',
        '--oo-color-muted': '#c2410c',
        '--oo-color-accent': '#fb923c',
        '--oo-color-line': '#431407',
        '--oo-color-border': '#431407',
        '--oo-color-surface': '#2a0f04',
        '--oo-color-surface-hover': '#431407',
        '--oo-color-surface-active': '#431407',
        '--oo-color-primary': '#fb923c',
        '--oo-color-active': '#431407',
        '--oo-color-danger': '#f87171',
        '--oo-color-success': '#4ade80',
        '--oo-color-warning': '#fbbf24',

        '--oo-sidebar-left-bg': '#2a0f04',
        '--oo-sidebar-left-fg': '#fed7aa',
        '--oo-sidebar-right-bg': '#2a0f04',
        '--oo-sidebar-right-fg': '#fed7aa',

        '--oo-scrollbar-track-color': 'transparent',
        '--oo-scrollbar-thumb-color': 'var(--oo-color-border)',
        '--oo-scrollbar-border-color': 'var(--oo-color-border)',
        '--oo-scrollbar-thumb-hover': 'var(--oo-color-active)',

        '--oo-activitybar-bg': '#2a0f04',
        '--oo-activitybar-fg': '#fed7aa',
        '--oo-activitybar-fg-hover': '#fff7ed',
        '--oo-activitybar-bg-hover': '#431407',
        '--oo-activitybar-fg-active': '#fb923c',
        '--oo-activitybar-bg-active': '#431407',
      },
    },
  },
};
