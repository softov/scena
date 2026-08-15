import type { CSSProperties, ReactNode } from 'react';
import { DangerZone, type DangerZoneProps } from './DangerZone.js';

export interface SettingsContainerProps {
  // The settings form (e.g. an embedded resource Form).
  children: ReactNode;
  // Optional destructive-action block rendered below the form.
  danger?: DangerZoneProps;
  style?: CSSProperties;
}

// Standard layout for a resource's Settings tab: the form, then an optional
// DangerZone. Keeps every resource's Settings tab consistent without repeating
// the wrapper + delete affordance.
export function SettingsContainer({ children, danger, style }: SettingsContainerProps): ReactNode {
  return (
    <div className="oo-settings" style={{ display: 'flex', flexDirection: 'column', gap: 24, ...style }}>
      {children}
      {danger ? <DangerZone {...danger} /> : null}
    </div>
  );
}
