import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables, isOverlaid, resolveSurfacePresentation } from '@softov/scena';
import type { ModusClass } from '@softov/scena';
import { useLayout, useStore } from '@softov/scena/react';
import { DEMO_PRESENTATION } from './presentation.js';

import './chrome.css';

/**
 * The app chrome: activity bar items, status items, a title.
 *
 * ---------------------------------------------------------------------------
 * This whole file is the third copy.
 * ---------------------------------------------------------------------------
 *
 * `ActivityBarItem` is registered under that exact name by the playground
 * (chrome.tsx), by Advisor (shell/ActivityBarItem.tsx, 180 lines) and now by
 * this app. Three implementations, one registry name, and every resource
 * module in all three references it as though it were part of the framework.
 * Same story for `StatusItem`.
 *
 * They are not identical, which is the interesting part: Advisor's carries
 * badge tones and a bottom-anchored position, the playground's carries a colour
 * token, this one is the minimum that works. Nobody chose those differences --
 * they are just what each app needed on the day. That is what a component
 * belongs-in-the-framework argument looks like from the outside.
 *
 * Deliberately minimal here: it is evidence, not a fourth opinion.
 */

interface ActivityBarItemProps {
  icon?: string;
  label?: string;
  badge?: number | string;
  section?: string;
  onClick?: () => void;
}

function ActivityBarItem({ icon, label, badge, section, onClick }: ActivityBarItemProps) {
  const activeSection = useStore<string | undefined>('$/layout/surfaces/sidebar:left/section');
  const isActive = section !== undefined && activeSection === section;
  return (
    <div
      className="demo-activity-item"
      title={label}
      data-active={isActive}
      role="button"
      tabIndex={0}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon ?? '·'}</span>
      {badge ? <span className="demo-activity-item__badge">{badge}</span> : null}
    </div>
  );
}

interface StatusItemProps {
  label?: string;
  value?: number | string;
}

function StatusItem({ label, value }: StatusItemProps) {
  return (
    <span className="demo-status-item">
      {label}: <strong>{value ?? '—'}</strong>
    </span>
  );
}

function AppTitle({ text }: { text?: string }) {
  return <span className="demo-title">{text ?? 'scena demo'}</span>;
}

/**
 * The open gap, made visible instead of only written down.
 *
 * Resolves the presentation this app's policy asks for at the current size
 * class, and reports it next to what the shell is actually doing. Narrow the
 * window: this reads `floating` (or `sheet`) while DefaultShell keeps the
 * sidebar docked and taking width from `main`, because DefaultShell renders
 * from `visible`/`size` and never consults a policy.
 *
 * Advisor closes that gap in shell/compact.ts. Nothing equivalent ships, which
 * is what this app exists to make obvious.
 */
function PresentationProbe() {
  const modus = useStore<ModusClass>('$/modus/class') ?? 'large';
  const layout = useLayout();
  const wanted = resolveSurfacePresentation('sidebar:left', modus, DEMO_PRESENTATION);
  const docked = layout.surfaces['sidebar:left']?.visible ?? true;
  const mismatch = isOverlaid(wanted) && docked;
  return (
    <span className="demo-status-item" data-warn={mismatch}>
      {modus} · policy wants <strong>{wanted}</strong>
      {mismatch ? ' · shell still docked' : ''}
    </span>
  );
}

export function registerChrome(scena: Scena): Disposable {
  return combineDisposables(
    scena.components.register({
      component: 'ActivityBarItem',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: ActivityBarItem as unknown }) },
    }),
    scena.components.register({
      component: 'StatusItem',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: StatusItem as unknown }) },
    }),
    scena.components.register({
      component: 'PresentationProbe',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: PresentationProbe as unknown }) },
    }),
    scena.components.register({
      component: 'AppTitle',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: AppTitle as unknown }) },
    }),

    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'chrome:title',
      resource: { component: 'AppTitle', text: 'scena demo' },
    }),
    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'chrome:presentation',
      resource: { component: 'PresentationProbe' },
    }),
    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'chrome:notes-count',
      resource: {
        component: 'StatusItem',
        label: 'Notes',
        value: { path: '$/summary/notes/total' },
      },
    }),
  );
}
