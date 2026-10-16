import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import type { MountAction } from '../../sdk/mount-surface.js';
import type { Scena } from '../../sdk/scena.js';
import type { WhenClause } from '../../sdk/when.js';
import { useScena } from '../../react/ScenaProvider.js';
import './HeaderAction.css';

// A button in a layout header: a section's (SectionHeader) or a stacked pane's
// (StackLayout). Shared so both draw `when`, `active` and `busy` the same way.

export const iconBtn: CSSProperties & { '--button-color'?: string } = {
  border: 'none',
  font: 'inherit',
  fontSize: 'var(--oo-font-size-sm)',
  lineHeight: 1,
  padding: '2px 5px',
  borderRadius: 4,
};

/** Whether an action's `when` holds now; an action without one always shows. */
export function shown(scena: Scena, action: MountAction): boolean {
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
export function HeaderAction({ action, text, run }: { action: MountAction; text: string; run: (command: string) => void }): ReactNode {
  const visible = useClause(action.when, true);
  const active = useClause(action.active, false);
  const busy = useClause(action.busy, false);
  if (!visible) return null;
  return (
    <button
      className="oo-btn oo-btn--icon oo-header-action"
      data-variant="ghost"
      type="button"
      title={text}
      aria-label={text}
      {...(action.active === undefined ? {} : { 'aria-pressed': active, 'data-active': active ? 'true' : undefined })}
      data-busy={busy ? 'true' : undefined}
      disabled={busy}
      onClick={() => run(action.command)}
      style={iconBtn}>
      <span className="oo-header-action__icon">{action.icon ?? text ?? '•'}</span>
    </button>
  );
}
