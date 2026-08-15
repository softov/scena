import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '../control/Button.js';
import './FormActions.css';

// Action button row for a form footer (submit / reset / cancel …). Two modes:
//   • children  — drop <Button>s in directly (most control, graph-friendly).
//   • actions[] — declarative list; `hidden` items are skipped. `icon` is
//                 folded into the label because Button has no icon slot.
export interface FormActionItem {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonProps['variant'];
  disabled?: boolean;
  hidden?: boolean;
  icon?: string;
}

export interface FormActionsProps {
  actions?: FormActionItem[];
  align?: 'start' | 'end' | 'between';   // default 'start'
  children?: ReactNode;
}

export function FormActions({ actions, align = 'start', children }: FormActionsProps) {
  return (
    <div className="oo-form-actions" data-align={align}>
      {actions
        ? actions
            .filter((a) => !a.hidden)
            .map((a, i) => (
              <Button
                key={i}
                type={a.type ?? 'button'}
                label={a.icon ? `${a.icon} ${a.label}` : a.label}
                variant={a.variant}
                disabled={a.disabled}
                onClick={a.onClick}
              />
            ))
        : null}
      {children}
    </div>
  );
}
