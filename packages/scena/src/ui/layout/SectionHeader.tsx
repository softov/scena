import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useState } from 'react';
import type { MountAction } from '../../sdk/mount-surface.js';
import { resolveLabel } from '../../sdk/label.js';
import type { Label } from '../../sdk/label.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import { useScena } from '../../react/ScenaProvider.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import type { Scena } from '../../sdk/scena.js';
import type { WhenClause } from '../../sdk/when.js';
import { translate } from '../../core/i18n/registry.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import './SectionHeader.css';

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
  userSelect: 'none',
  minWidth: 0,
  minHeight: 32,
};
const iconBtn: CSSProperties & { '--button-color'?: string } = {
  border: 'none',
  font: 'inherit',
  fontSize: 'var(--oo-font-size-sm)',
  lineHeight: 1,
  padding: '2px 5px',
  borderRadius: 4,
};

/** Whether an action's `when` holds now; an action without one always shows. */
function shown(scena: Scena, action: MountAction): boolean {
  return action.when === undefined || scena.when.evaluate(action.when);
}

/** A clause's value, kept current as the store changes; `fallback` without a clause. */
function useClause(clause: WhenClause | undefined, fallback: boolean): boolean {
  const scena = useScena();
  const [value, setValue] = useState(() => (clause === undefined ? fallback : scena.when.evaluate(clause)));
  useEffect(() => {
    if (clause === undefined) return undefined;
    const watch = scena.when.watch(clause, setValue);
    return () => watch.dispose();
  }, [scena, clause]);
  return clause === undefined ? fallback : value;
}

/**
 * One header button. Its own component so it can watch its `when`, `active`
 * and `busy` clauses, re-rendering alone when they change.
 */
function HeaderAction({ action, text, run }: { action: MountAction; text: string; run: (command: string) => void }): ReactNode {
  const visible = useClause(action.when, true);
  const active = useClause(action.active, false);
  const busy = useClause(action.busy, false);
  if (!visible) return null;
  return (
    <button
      className="oo-btn oo-btn--icon oo-section-header__action"
      data-variant="ghost"
      type="button"
      title={text}
      aria-label={text}
      {...(action.active === undefined ? {} : { 'aria-pressed': active, 'data-active': active ? 'true' : undefined })}
      data-busy={busy ? 'true' : undefined}
      disabled={busy}
      onClick={() => run(action.command)}
      style={iconBtn}>
      <span className="oo-section-header__action-icon">{action.icon ?? text ?? '•'}</span>
    </button>
  );
}
