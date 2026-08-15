import type { ReactNode } from 'react';
import { Button } from './Button.js';
import { useI18n } from '../../react/hooks/useI18n.js';

export interface ReloadButtonProps {
  onClick: () => void | Promise<void>;
  // Tooltip override; defaults to the shared `common/reload` message.
  title?: string;
}

// One consistent reload affordance for detail headers: an icon button with a
// tooltip. Use everywhere instead of hand-rolling a per-resource button.
export function ReloadButton({ onClick, title }: ReloadButtonProps): ReactNode {
  const { t } = useI18n();
  return <Button title={title ?? t('common/reload', 'Reload')} label="⟳" variant="ghost" onClick={onClick} />;
}
