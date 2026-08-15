import { type ChangeEvent, type ReactNode } from 'react';
import { useLayout, useScena, useStore, useStoreSetter } from '@softov/scena/react';
import type { SurfaceName } from '@softov/scena/types';
import { ContainerMenu } from '@softov/scena/ui';
import { listThemes } from '@softov/scena/styles';
import {
  THEME_ID_PATH,
  THEME_MODE_PATH,
  type ThemeModeChoice,
} from '../register-theme.js';
import './SettingsPanel.css';

// Layout / theme controls. Drives scena.layout.setSurface directly so the
// chrome reacts immediately. Each toggle mirrors what the web app's layout
// config used to do — kept simple, no fancy form components, just labels +
// checkboxes / selects backed by useLayout().
//
// Lives under sidebar:left when section === 'settings'.

const SURFACES: SurfaceName[] = [
  'titlebar',
  'activitybar',
  'sidebar:left',
  'sidebar:right',
  'main',
  'panel:bottom',
  'statusbar',
  'overlay',
];

const THEME_MODES: readonly ThemeModeChoice[] = ['light', 'dark', 'system'];

export default function SettingsPanel(): ReactNode {
  const scena = useScena();
  const layout = useLayout();
  const setStore = useStoreSetter();
  const mode = useStore<ThemeModeChoice>(THEME_MODE_PATH) ?? 'system';
  const themeId = useStore<string>(THEME_ID_PATH) ?? 'default';
  const themes = listThemes();

  const mainLayoutId = layout.surfaces.main?.layout ?? 'tab';
  const mainLayouts = scena.layouts
    .list()
    .filter((l) => !l.appliesTo || l.appliesTo.includes('main'));

  function setSurfaceVisible(surface: SurfaceName, visible: boolean): void {
    scena.layout.setSurface(surface, { visible });
  }
  function setMainLayout(id: string): void {
    scena.layout.setSurface('main', { layout: id });
  }

  return (
    <div className="settings-panel">
      <header className="settings-panel__head">
        <h2>Settings</h2>
        <p className="settings-panel__sub">
          Live layout + theme controls. Every change writes through
          scena.layout — same API any app uses.
        </p>
      </header>

      <Section title="Theme">
        <label className="settings-row">
          <span>Color mode</span>
          <select
            value={mode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setStore(THEME_MODE_PATH, e.currentTarget.value as ThemeModeChoice)
            }
          >
            {THEME_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="settings-row">
          <span>Theme family</span>
          <select
            value={themeId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setStore(THEME_ID_PATH, e.currentTarget.value)
            }
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Surfaces — visibility">
        {SURFACES.map((s) => {
          const state = layout.surfaces[s];
          const visible = state?.visible ?? false;
          return (
            <label key={s} className="settings-row settings-row--check">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setSurfaceVisible(s, e.currentTarget.checked)}
              />
              <span><code>{s}</code></span>
            </label>
          );
        })}
      </Section>

      <Section title="Main layout">
        <label className="settings-row">
          <span>Render strategy</span>
          <select
            value={mainLayoutId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMainLayout(e.currentTarget.value)}
          >
            {mainLayouts.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Surface sizes">
        {(['sidebar:left', 'sidebar:right', 'panel:bottom'] as SurfaceName[]).map((s) => {
          const state = layout.surfaces[s];
          const size = state?.size ?? 0;
          return (
            <label key={s} className="settings-row">
              <span><code>{s}</code> size</span>
              <input
                type="number"
                value={size}
                step={20}
                min={0}
                max={800}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  scena.layout.setSurface(s, { size: Number(e.currentTarget.value) || 0 })
                }
                style={{ width: 72 }}
              />
            </label>
          );
        })}
      </Section>

      <Section title="Layout">
        <ContainerMenu
          spec={{
            query: { slot: 'menu:layout' },
            groupOrder: ['View', 'Modes', 'Zones'],
          }}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}
