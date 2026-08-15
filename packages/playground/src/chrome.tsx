import { CSSProperties, useEffect, useState } from 'react';
import { resolveColorVar, type Scena, type ScenaColor, type SurfaceName } from '@softov/scena/types';
import { useLayout, useScena, useStore, useStoreSetter } from '@softov/scena/react';
import { simulateAgentSurface } from './simulate-agent-surface.js';
import { listThemes } from '@softov/scena/styles';
import {
  THEME_ID_PATH,
  THEME_MODE_PATH,
  type ThemeModeChoice,
} from './register-theme.js';

// Chrome-only components for the dev playground. The a2ui basic catalog
// (Card, Text, Button, TextField, …) is registered separately via
// `registerBuiltins()` in @softov/scena/ui.

interface ActivityBarItemProps {
  icon?: string;
  color?: ScenaColor | 'inherit';
  label?: string;
  badge?: number | string;
  section?: string;
  pos?: 'top' | 'bottom';
  onClick?: () => void;
}

function ActivityBarItem({ 
  icon, 
  color,
  label, badge, section, pos, onClick }: ActivityBarItemProps) {
  const activeSection = useStore<string | undefined>('$/ui/sidebar/left/section');
  const isActive = section !== undefined && activeSection === section;
  return (
    <div
      className="activity-icon"
      title={label}
      data-color={color ?? 'inherit'}
      data-active={isActive}
      data-pos={pos}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        ...({ ['--oo-icon-color' as string]: resolveColorVar(color ?? 'inherit') } as CSSProperties)
        // ['--oo-color-icon']: resolveColorVar(color ?? 'inherit') as string,
      }}
    >
      <span>{icon ?? '·'}</span>
      {badge ? <span className="badge">{badge}</span> : null}
    </div>
  );
}

interface StatusItemProps {
  label?: string;
  value?: number | string;
  side?: 'left' | 'right';
  onClick?: () => void;
}

function StatusItem({ label, value, onClick }: StatusItemProps) {
  return (
    <span style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {label}: <strong>{value ?? '—'}</strong>
    </span>
  );
}

// ── Titlebar components ───────────────────────────────────────────────────

interface AppTitleProps { text?: string }
function AppTitle({ text }: AppTitleProps) {
  return <span className="title-bar__app">{text ?? 'scena'}</span>;
}

interface MainLayoutSelectProps { label?: string }
function MainLayoutSelect({ label }: MainLayoutSelectProps) {
  const scena = useScena();
  const layout = useLayout();
  const current = layout.surfaces.main?.layout ?? 'tab';
  const [layouts, setLayouts] = useState(() =>
    scena.layouts.list().filter((l) => !l.appliesTo || l.appliesTo.includes('main')),
  );
  useEffect(() => {
    const refresh = () =>
      setLayouts(scena.layouts.list().filter((l) => !l.appliesTo || l.appliesTo.includes('main')));
    const sub = scena.events.on('scena:registry:changed', (payload) => {
      if ((payload as { registry: string }).registry === 'layouts') refresh();
    });
    refresh();
    return () => sub.dispose();
  }, [scena]);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ color: 'var(--oo-color-muted)' }}>{label ?? 'main:'}</span>
      <select
        value={current}
        onChange={(e) => scena.commands.execute('main.setLayout', { layout: e.target.value })}
      >
        {layouts.map((l) => (
          <option key={l.id} value={l.id}>{l.title}</option>
        ))}
      </select>
    </label>
  );
}

interface SurfaceToggleProps {
  surface?: SurfaceName;
  icon?: string;
  label?: string;
}
function SurfaceToggle({ surface, icon, label }: SurfaceToggleProps) {
  const scena = useScena();
  const layout = useLayout();
  if (!surface) return null;
  const visible = layout.surfaces[surface]?.visible ?? false;
  return (
    <button
      title={label ?? `Toggle ${surface}`}
      data-active={visible}
      onClick={() => scena.layout.setSurface(surface, { visible: !visible })}
    >
      {icon ?? '◨'}
    </button>
  );
}

interface CommandButtonProps { command?: string; label?: string; icon?: string }
function CommandButton({ command, label, icon }: CommandButtonProps) {
  const scena = useScena();
  if (!command) return null;
  return (
    <button
      title={label ?? command}
      onClick={() => { void scena.commands.execute(command); }}
    >
      {icon ? <span style={{ marginRight: 4 }}>{icon}</span> : null}
      {label ?? command}
    </button>
  );
}

function SimulateButton() {
  return <button onClick={() => simulateAgentSurface()}>Simulate surface</button>;
}

// Themes have two axes: family (default, solarized, sunset, …) and mode
// (light, dark, or 'system' → follow OS). Both axes live in scena.store
// at THEME_ID_PATH / THEME_MODE_PATH; registerTheme() owns the single
// applyTheme + localStorage subscriber. These chrome widgets are
// thin reactive views over the store — no DOM/localStorage access here.
const MODE_ORDER: ThemeModeChoice[] = ['light', 'dark', 'system'];
const MODE_ICON: Record<ThemeModeChoice, string> = {
  light: '☀',
  dark: '☾',
  system: '◐',
};

function ThemeToggle() {
  const mode = useStore<ThemeModeChoice>(THEME_MODE_PATH) ?? 'system';
  const setStore = useStoreSetter();
  const next = MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length]!;
  return (
    <button
      title={`Mode: ${mode} — click for ${next}`}
      data-theme-mode={mode}
      onClick={() => setStore(THEME_MODE_PATH, next)}
    >
      {MODE_ICON[mode]}
    </button>
  );
}

function ThemePicker() {
  const themeId = useStore<string>(THEME_ID_PATH) ?? 'default';
  const setStore = useStoreSetter();
  const themes = listThemes();
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ color: 'var(--oo-color-muted)' }}>theme:</span>
      <select value={themeId} onChange={(e) => setStore(THEME_ID_PATH, e.currentTarget.value)}>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </label>
  );
}

export function registerChrome(scena: Scena): void {
  scena.components.register({
    component: 'ActivityBarItem',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: ActivityBarItem as unknown }) },
  });
  scena.components.register({
    component: 'StatusItem',
    category: 'statusbar',
    renderer: { kind: 'react', load: async () => ({ default: StatusItem as unknown }) },
  });
  scena.components.register({
    component: 'AppTitle',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: AppTitle as unknown }) },
  });
  scena.components.register({
    component: 'MainLayoutSelect',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: MainLayoutSelect as unknown }) },
  });
  scena.components.register({
    component: 'SurfaceToggle',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: SurfaceToggle as unknown }) },
  });
  scena.components.register({
    component: 'CommandButton',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: CommandButton as unknown }) },
  });
  scena.components.register({
    component: 'SimulateButton',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: SimulateButton as unknown }) },
  });
  scena.components.register({
    component: 'ThemeToggle',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: ThemeToggle as unknown }) },
  });
  scena.components.register({
    component: 'ThemePicker',
    category: 'chrome',
    renderer: { kind: 'react', load: async () => ({ default: ThemePicker as unknown }) },
  });
}
