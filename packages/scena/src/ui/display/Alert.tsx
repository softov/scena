import type { CSSProperties, ReactNode } from 'react';
import './Alert.css';
import { NAMED_GLYPH } from './Icon.js';

// Inline banner: info / success / warning / danger. Icon is auto-derived from
// tone unless explicitly set. Body slot accepts any ReactNode.
export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  message?: ReactNode;
  icon?: string;
  onClose?: () => void;
  style?: CSSProperties;
  className?: string;
}

const TONE_ICON: Record<AlertTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  danger: '✕',
};

export function Alert({
  tone = 'info',
  title,
  children,
  message,
  icon,
  onClose,
  style,
  className,
}: AlertProps) {
  const body = children ?? message;
  return (
    <div
      className={['oo-alert', className].filter(Boolean).join(' ')}
      data-tone={tone}
      role="status"
      style={style}
    >
      <span className="oo-alert__icon" aria-hidden>
        {icon ?? TONE_ICON[tone]}
      </span>
      <div className="oo-alert__body">
        {title ? <strong className="oo-alert__title">{title}</strong> : null}
        {body ? <span className="oo-alert__message">{body}</span> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          className="oo-alert__close"
          onClick={onClose}
          aria-label="Dismiss"
        >
          {NAMED_GLYPH.closePanel}
        </button>
      ) : null}
    </div>
  );
}
