import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../control/Button.js';

export interface DangerZoneProps {
  // Destructive action button label, e.g. "Delete User".
  label: string;
  // Explanation shown above the button.
  description?: ReactNode;
  // window.confirm text; when set, the action only runs if confirmed.
  //
  // For an `onConfirm` that does NOT ask for itself. Most callers dispatch a
  // command, and a destructive command normally asks on its own - setting this
  // as well makes deleting a two-step confirmation for one action, and this
  // prompt is `window.confirm`, so it also bypasses whatever the application
  // uses to ask everywhere else.
  confirmMessage?: string;
  onConfirm: () => void | Promise<void>;
}

// A bordered destructive-action block for settings panels (mirrors web's
// DangerZone). Used by SettingsContainer so resources don't re-implement the
// delete affordance.
export function DangerZone({ label, description, confirmMessage, onConfirm }: DangerZoneProps): ReactNode {
  function run(): void {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    void onConfirm();
  }
  return (
    <div className="oo-danger-zone" style={wrap}>
      <div style={title}>⚠︎ DANGER ZONE</div>
      {description ? <div style={desc}>{description}</div> : null}
      <div>
        <Button label={`🗑︎ ${label}`} variant="danger" size="sm" onClick={run} />
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  borderTop: '1px solid rgb(var(--oo-rgb-danger) / 0.3)',
  paddingTop: 'var(--oo-spacing-md, 16px)',
  paddingBottom: 'var(--oo-spacing-md, 16px)',
  paddingLeft: 'var(--oo-spacing-md, 16px)',
  paddingRight: 'var(--oo-spacing-md, 16px)',
};
const title: CSSProperties = {
  fontSize: 'var(--oo-font-size-sm)',
  color: 'var(--oo-color-danger)',
};
const desc: CSSProperties = {
  fontSize: 'var(--oo-font-size-xs)',
  color: 'var(--oo-color-muted)',
};
