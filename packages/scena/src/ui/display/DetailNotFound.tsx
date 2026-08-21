import type { CSSProperties, ReactNode } from 'react';
import { translate } from '../../core/i18n/registry.js';
import { Button, type ButtonProps } from '../control/Button.js';
import type { ResourceColor } from '../../sdk/colors.js';

export interface DetailNotFoundAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
}

export interface DetailNotFoundProps {
  title: string;
  icon?: ReactNode;
  color?: ResourceColor;
  // Explicit buttons. `onRetry`/`onClose` add common-language buttons on top.
  actions?: DetailNotFoundAction[];
  onRetry?: () => void;
  onClose?: () => void;
}

// Centered empty/error state for a detail surface: a colored icon, a title, and
// optional action buttons. Replaces the ad-hoc `<div>… not found</div>` each
// resource Detail used. Close/Retry labels use the shared `common/*` messages.
export function DetailNotFound({ title, icon, color, actions, onRetry, onClose }: DetailNotFoundProps): ReactNode {
  const buttons: DetailNotFoundAction[] = [
    ...(actions ?? []),
    ...(onRetry ? [{ label: translate('common/retry', 'Retry'), onClick: onRetry, variant: 'primary' as const }] : []),
    ...(onClose ? [{ label: translate('common/close', 'Close'), onClick: onClose, variant: 'default' as const }] : []),
  ];
  return (
    <div style={wrap}>
      {icon ? (
        <div className="oo-detail-notfound__icon" data-color={color} style={iconCircle}>
          {icon}
        </div>
      ) : null}
      <div style={titleStyle}>{title}</div>
      {buttons.length ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {buttons.map((a, i) => (
            <Button key={i} label={a.label} variant={a.variant ?? 'default'} onClick={a.onClick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const wrap: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--oo-spacing-md, 12px)',
  padding: 'var(--oo-spacing-lg, 24px)',
  textAlign: 'center',
};
const iconCircle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: '50%',
  fontSize: 24,
  background: 'var(--oo-color-surface, #1e2128)',
  border: '1px solid var(--oo-color-border, #2b2f37)',
};
const titleStyle: CSSProperties = {
  fontSize: 'var(--oo-font-size-md, 15px)',
  color: 'var(--oo-color-text, #e6e8eb)',
};
