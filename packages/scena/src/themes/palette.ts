/**
 * Every colour a theme names, as `"R G B"` channel triples: what the
 * `--oo-rgb-*` tokens hold, so one token serves a solid fill and a translucent
 * tint.
 */
export interface Palette {
  /** Behind everything. */
  canvas: string;
  /** Chrome: title bar, activity bar, sidebars, status bar. */
  panel: string;
  /** Where content sits. */
  surface: string;
  /** Above the surface: popups, cards. */
  raised: string;
  text: string;
  muted: string;
  subtle: string;
  /** Hairlines inside a surface. */
  line: string;
  /** The edge of a surface. */
  border: string;
  hover: string;
  active: string;
  selected: string;
  accent: string;
  /** Buttons and links; the accent when absent. */
  primary?: string;
  /** Text on the accent. Not white in a theme whose accent is pale. */
  onAccent: string;
  danger?: string;
  success?: string;
  warning?: string;
  info?: string;
}

/**
 * A palette as the tokens scena reads.
 *
 * Every chrome surface takes `panel`, so the title bar, activity bar, sidebars
 * and status bar read as one frame. Each colour is the one meant to land on
 * screen, so the line and border fades are off.
 */
export function paletteTokens(p: Palette): Record<string, string> {
  const optional = (name: string, value: string | undefined): Record<string, string> => (value === undefined ? {} : { [`--oo-rgb-${name}`]: value });
  return {
    '--oo-rgb-canvas': p.canvas,
    '--oo-rgb-panel': p.panel,
    '--oo-rgb-surface': p.surface,
    '--oo-rgb-raised': p.raised,
    '--oo-rgb-titlebar': p.panel,
    '--oo-rgb-activitybar': p.panel,
    '--oo-rgb-sidebar': p.panel,
    '--oo-rgb-statusbar': p.panel,
    '--oo-rgb-text': p.text,
    '--oo-rgb-muted': p.muted,
    '--oo-rgb-subtle': p.subtle,
    '--oo-rgb-line': p.line,
    '--oo-rgb-border': p.border,
    '--oo-rgb-hover': p.hover,
    '--oo-rgb-active': p.active,
    '--oo-rgb-selected': p.selected,
    '--oo-rgb-accent': p.accent,
    '--oo-rgb-primary': p.primary ?? p.accent,
    '--oo-rgb-inverse': p.onAccent,
    ...optional('danger', p.danger),
    ...optional('success', p.success),
    ...optional('warning', p.warning),
    ...optional('info', p.info),
    '--oo-line-alpha': '1',
    '--oo-border-alpha': '1',
  };
}
