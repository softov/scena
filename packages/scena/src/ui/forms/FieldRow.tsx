import { useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useI18n } from '../../react/hooks/useI18n.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import { Popup } from '../overlay/Popup.js';

export interface FieldRowProps {
  fieldKey: string;
  // The value the field shows: the form's, else the schema's default.
  value: unknown;
  // Whether the form's value holds the key; reset is offered only then.
  inValue: boolean;
  onReset: () => void;
  // Present when the form has a `json` view to show.
  onShowJson?: () => void;
  children: ReactNode;
}

// A top-level field with its actions: the key in a tooltip on hover and focus,
// and a gear whose menu resets the field, copies its key or its JSON, or shows
// the form's JSON. A Popup, not ContextMenu, so a form outside a scena root
// draws it too.
export function FieldRow({ fieldKey, value, inValue, onReset, onShowJson, children }: FieldRowProps) {
  const { t } = useI18n();
  const tipId = useId();
  const gear = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const close = (): void => setMenu(null);
  const toggle = (): void => {
    if (menu !== null) return close();
    const box = gear.current?.getBoundingClientRect();
    setMenu({ x: box?.left ?? 0, y: (box?.bottom ?? 0) + 2 });
  };
  // The popup closes on a mousedown outside it; the gear's own would close it
  // and the click would open it again.
  const keepOpen = (event: MouseEvent): void => {
    if (menu !== null) event.stopPropagation();
  };
  const run = (action: () => void) => (): void => {
    close();
    action();
  };
  const copy = (text: string) => run(() => void navigator.clipboard?.writeText(text));

  return (
    <div className="oo-schema-form__row" data-menu={menu !== null ? 'true' : 'false'}>
      <button
        ref={gear}
        type="button"
        className="oo-schema-form__gear"
        aria-label={t('form/fieldActions', 'Setting actions')}
        aria-describedby={tipId}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        onMouseDown={keepOpen}
        onClick={toggle}
      >
        {NAMED_GLYPH.settings}
      </button>
      <span role="tooltip" id={tipId} className="oo-schema-form__key">{fieldKey}</span>
      <div className="oo-schema-form__row-body">{children}</div>
      {menu === null ? null : (
        <Popup x={menu.x} y={menu.y} onClose={close} className="oo-schema-form__menu">
          <div role="menu" aria-label={t('form/fieldActions', 'Setting actions')}>
            <button type="button" role="menuitem" disabled={!inValue} onClick={run(onReset)}>{t('form/resetField', 'Reset setting')}</button>
            <hr />
            <button type="button" role="menuitem" onClick={copy(fieldKey)}>{t('form/copyId', 'Copy setting ID')}</button>
            <button type="button" role="menuitem" onClick={copy(`${JSON.stringify(fieldKey)}: ${JSON.stringify(value ?? null)}`)}>{t('form/copyJson', 'Copy setting as JSON')}</button>
            {onShowJson === undefined ? null : (
              <>
                <hr />
                <button type="button" role="menuitem" onClick={run(onShowJson)}>{t('form/showJson', 'Show in JSON')}</button>
              </>
            )}
          </div>
        </Popup>
      )}
    </div>
  );
}
