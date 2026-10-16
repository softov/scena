import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useState } from 'react';
import type { MountAction } from '../../sdk/mount-surface.js';
import { resolveLabel } from '../../sdk/label.js';
import type { Label } from '../../sdk/label.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import { useScena } from '../../react/ScenaProvider.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import { translate } from '../../core/i18n/registry.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { HeaderAction, iconBtn, shown } from './HeaderAction.js';

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
  const { t } = useI18n(); // also re-resolves `{ t }` labels on locale switch
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
          {actions.map((a) => <HeaderAction key={a.command} action={a} text={label(a)} run={run} />)}
          {actions.length ? (
            <button
              className="oo-btn oo-btn--icon"
              data-variant="ghost"
              type="button"
              title={t('common/moreActions', 'More actions')}
              aria-label={t('common/moreActions', 'More actions')}
              onClick={openMenu}
              style={iconBtn}>
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
            items: actions.filter((a) => shown(scena, a)).map((a) => ({
              title: label(a) || a.command,
              icon: a.icon,
              ...(a.active === undefined ? {} : { active: scena.when.evaluate(a.active) }),
              // A button that opens a menu opens it here as a sub-list.
              onSelect: (h) => {
                if (a.menu !== undefined) {
                  h.pushList({ title: label(a) || a.command, query: { slot: a.menu } });
                  return;
                }
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
  userSelect: 'none',
  minWidth: 0,
  minHeight: 32,
};
