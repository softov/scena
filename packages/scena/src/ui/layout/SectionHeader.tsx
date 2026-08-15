import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useState } from 'react';
import type { MountAction } from '../../types/mount-surface.js';
import { resolveLabel } from '../../core/label.js';
import type { Label } from '../../types/label.js';
import type { BindingPath } from '../../types/component-graph.js';
import { useScena } from '../../react/ScenaProvider.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import { translate } from '../../i18n/registry.js';
import { ContextMenu } from '../menu/ContextMenu.js';

export interface SectionHeaderProps {
  title: Label; // string | { path } | { t } — resolved reactively
  icon?: ReactNode;
  color?: string;
  // `[icon Title]            [Act1][Act2][⋯]` — each action runs its command;
  // the `[⋯]` lists them all (labels) for discoverability.
  actions?: MountAction[];
}

// The header strip for a sidebar section (single layout) — same visual language
// as StackHeader's container strip, plus an action row. Title/icon/actions come
// from the active mount's display (mount.props ?? component.props).
export function SectionHeader({ title, icon, color, actions = [] }: SectionHeaderProps): ReactNode {
  const scena = useScena();
  useI18n(); // re-resolve `{ t }` labels on locale switch
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const run = (command: string) => void scena.commands.execute(command);
  const resolve = (l: Label | undefined) =>
    resolveLabel(l, { get: (p) => scena.store.get(p as BindingPath), translate });
  const label = (a: MountAction) => resolve(a.label);
  const titleText = resolve(title);

  function openMenu(e: ReactMouseEvent<HTMLButtonElement>): void {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: r.right, y: r.bottom + 2 });
  }

  return (
    <>
      <div className="oo-section-header" data-color={color} style={headerStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {icon ? <span className="oo-section-header__icon" aria-hidden>{icon}</span> : null}
          <span className="oo-section-header__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{titleText}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          {actions.map((a) => {
            const text = label(a);
            return (
              <button key={a.command} type="button" title={text} aria-label={text} onClick={() => run(a.command)} style={iconBtn}>
                {a.icon ?? text ?? '•'}
              </button>
            );
          })}
          {actions.length ? (
            <button type="button" title="More actions" aria-label="More actions" onClick={openMenu} style={iconBtn}>
              ⋯
            </button>
          ) : null}
        </span>
      </div>
      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          spec={{
            footerHints: true,
            items: actions.map((a) => ({
              title: label(a) || a.command,
              icon: a.icon,
              onSelect: (h) => {
                run(a.command);
                h.closeMenu();
              },
            })),
          }}
        />
      ) : null}
    </>
  );
}

const headerStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--oo-spacing-xs) var(--oo-spacing-sm)',
  background: 'var(--oo-color-surface)',
  borderBottom: '1px solid var(--oo-color-border)',
  fontSize: 'var(--oo-font-size-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--oo-color-muted)',
  userSelect: 'none',
  minWidth: 0,
  minHeight: 32,
};
const iconBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--oo-color-muted)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--oo-font-size-sm)',
  lineHeight: 1,
  padding: '2px 5px',
  borderRadius: 4,
};
