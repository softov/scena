import { registerTheme } from '@softov/scena/styles';

/**
 * A second theme family, so the title bar's `ThemePicker` has something to do.
 *
 * `ThemePicker` renders nothing below two choices — one theme is not a choice —
 * so an app that registers none of its own gets no picker at all. That is the
 * right default and it is also why this file exists: the point of this app is
 * to exercise the components scena ships, and a control that never renders
 * exercises nothing.
 *
 * Registered as `tokens` rather than as a stylesheet on purpose. The playground
 * loads its four themes as `?url` CSS files, which is the other source kind, so
 * between the two apps both paths are actually run. This one also happens to be
 * the only kind available here: this package has no vite aliases into scena's
 * sources and no build step of its own for CSS.
 *
 * Only the raw `--oo-rgb-*` channels are overridden, never a resolved
 * `--oo-color-*`. The resolved colours are composed as
 * `rgb(var(--oo-rgb-x) / var(--oo-…-alpha))`, so overriding a channel keeps
 * every alpha-derived variant — hover, active, borders — in step, while
 * overriding the resolved colour would freeze them all at full opacity.
 */
registerTheme({
  id: 'sepia',
  label: 'Sepia',
  variants: {
    light: {
      kind: 'tokens',
      tokens: {
        '--oo-rgb-canvas': '250 246 237',
        '--oo-rgb-panel': '243 236 222',
        '--oo-rgb-surface': '250 246 237',
        '--oo-rgb-raised': '255 252 245',
        '--oo-rgb-text': '61 50 38',
        '--oo-rgb-muted': '140 124 104',
        '--oo-rgb-subtle': '166 150 128',
        '--oo-rgb-accent': '166 106 44',
        '--oo-rgb-border': '206 190 166',
      },
    },
    dark: {
      kind: 'tokens',
      tokens: {
        '--oo-rgb-canvas': '32 28 24',
        '--oo-rgb-panel': '26 23 19',
        '--oo-rgb-surface': '38 33 28',
        '--oo-rgb-raised': '45 39 33',
        '--oo-rgb-text': '234 224 208',
        '--oo-rgb-muted': '150 136 118',
        '--oo-rgb-subtle': '122 110 95',
        '--oo-rgb-accent': '212 154 88',
        '--oo-rgb-border': '70 61 51',
      },
    },
  },
});
