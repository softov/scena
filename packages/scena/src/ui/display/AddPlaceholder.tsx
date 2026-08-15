import type { CSSProperties, ReactNode } from 'react';

export interface AddPlaceholderProps {
  label: string;
  onClick: () => void;
}

// A subtle full-width "add" affordance rendered AFTER an explorer list (mirrors
// web's AddPlaceholder). The primary New action lives in the section header;
// this is the convenient end-of-list shortcut.
export function AddPlaceholder({ label, onClick }: AddPlaceholderProps): ReactNode {
  return (
    <button type="button" className="oo-add-placeholder" onClick={onClick} style={style}>
      <span aria-hidden>＋</span> {label}
    </button>
  );
}

const style: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  margin: 0,
  background: 'transparent',
  border: '1px dashed var(--oo-color-border, #2b2f37)',
  borderRadius: 6,
  color: 'var(--oo-color-muted, #8a8f98)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--oo-font-size-xs, 12px)',
  textAlign: 'left',
};
