import { useEffect, useRef, useState } from 'react';
import type { CloseAsk } from '../sdk/mount-surface.js';
import { useI18n } from './hooks/useI18n.js';
import { useLabel } from './hooks/useLabel.js';
import { useScena } from './ScenaProvider.js';

/**
 * The question a guarded close asks: close, and lose the work, or keep it
 * open. It is a native modal <dialog>, so it sits over everything, keeps the
 * focus inside, and gives the focus back when it closes. Esc and a click
 * beside it keep the mount open.
 *
 * `DefaultShell` renders one. A shell of its own renders it once too.
 */
export function CloseConfirm() {
  const scena = useScena();
  const { t } = useI18n('close');
  const [ask, setAsk] = useState<CloseAsk | null>(() => scena.surfaces.closeAsked());
  // What the dialog shows. It stays while the dialog closes, so the text does
  // not go blank under the closing dialog.
  const [shown, setShown] = useState<CloseAsk | null>(ask);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useLabel(shown?.title) || shown?.key || '';

  useEffect(() => {
    const sub = scena.events.on('scena:mount:close-asked', (next) => setAsk(next as CloseAsk | null));
    setAsk(scena.surfaces.closeAsked());
    return () => sub.dispose();
  }, [scena]);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (ask === null) {
      if (element.open) element.close();
      return;
    }
    setShown(ask);
    if (!element.open) element.showModal();
  }, [ask]);

  return (
    <dialog
      ref={dialog}
      className="oo-close-confirm"
      role="alertdialog"
      aria-labelledby="oo-close-confirm-title"
      aria-describedby="oo-close-confirm-reason"
      onCancel={(event) => {
        event.preventDefault();
        scena.surfaces.answerClose(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) scena.surfaces.answerClose(false);
      }}
    >
      <h2 id="oo-close-confirm-title" className="oo-close-confirm__title">
        {t('title', { title, fallback: 'Close {title}?' })}
      </h2>
      <p id="oo-close-confirm-reason" className="oo-close-confirm__reason">
        {shown?.reason}
      </p>
      <div className="oo-close-confirm__actions">
        <button type="button" autoFocus onClick={() => scena.surfaces.answerClose(false)}>
          {t('keep', 'Keep open')}
        </button>
        <button type="button" data-variant="danger" onClick={() => scena.surfaces.answerClose(true)}>
          {t('close', 'Close')}
        </button>
      </div>
    </dialog>
  );
}
