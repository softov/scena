import { type ReactNode, useEffect, useState } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { NAMED_GLYPH } from '../display/Icon.js';

// a2ui v0.10: required `trigger` (ComponentId) + `content` (ComponentId).
// scena's controlled model (`open`/`defaultOpen`/`child`) diverges from spec
// (Group D — deferred). `weight` from CatalogComponentCommon added here.
export interface ModalProps {
  weight?: number;
  // scena controlled-mode props (extensions; architectural divergence vs spec):
  open?: boolean;
  defaultOpen?: boolean;
  title?: string;
  child?: ReactNode;
  children?: ReactNode;
  onClose?: () => void | Promise<void>;
  dismissable?: boolean;
}

// Backdrop + centered card. `open` is bindable via `useWriteBack('open')` so
// the modal can close itself when bound to a DataBinding; uncontrolled (literal)
// open just keeps internal state and silently no-ops the write.
export function Modal({
  open,
  defaultOpen,
  title,
  child,
  children,
  onClose,
  dismissable = true,
}: ModalProps) {
  const writeOpen = useWriteBack('open');
  const [internalOpen, setInternalOpen] = useState<boolean>(
    open ?? defaultOpen ?? false,
  );

  useEffect(() => {
    if (open === undefined) return;
    setInternalOpen((current) => (current === open ? current : open));
  }, [open]);

  function close(): void {
    if (!dismissable) return;
    setInternalOpen(false);
    writeOpen(false);
    void onClose?.();
  }

  if (!internalOpen) return null;
  const body = child ?? children;
  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--oo-color-canvas, #fff)',
          color: 'var(--oo-color-fg, inherit)',
          border: '1px solid var(--oo-color-border)',
          borderRadius: 'var(--oo-radius-sm, 4px)',
          padding: 16,
          minWidth: 320,
          maxWidth: '80vw',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        {title ? (
          <div
            style={{
              fontWeight: 600,
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{title}</span>
            {dismissable ? (
              <button
                type="button"
                onClick={close}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
                aria-label="Close"
              >
                {NAMED_GLYPH.closePanel}
              </button>
            ) : null}
          </div>
        ) : null}
        {body}
      </div>
    </div>
  );
}
