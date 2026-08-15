import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { weightStyle } from '../_utils.js';
import { Checks, type CheckRuleResolved } from './Checks.js';
import { ControlHint, ControlError } from './_field-parts.js';
import './CheckBox.css';

// a2ui v0.10: required `label`, `value`. `weight` from CatalogComponentCommon.
export interface CheckBoxProps {
  label?: string;
  value?: boolean;
  weight?: number;
  // scena extensions:
  defaultValue?: boolean;
  disabled?: boolean;
  checks?: CheckRuleResolved[];
  // Field chrome — the label sits inline after the box; hint/error stack below.
  hint?: string;
  error?: string;
  required?: boolean;
  // Controlled escape hatch for direct-React use. Fires alongside write-back.
  onChange?: (next: boolean) => void;
}

export function CheckBox({
  value,
  defaultValue,
  label,
  disabled,
  checks,
  weight,
  hint,
  error,
  required,
  onChange: onChangeProp,
}: CheckBoxProps) {
  const writeValue = useWriteBack('value');
  const [internal, setInternal] = useState<boolean>(value ?? defaultValue ?? false);

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const next = e.currentTarget.checked;
    setInternal(next);
    writeValue(next);
    onChangeProp?.(next);
  }

  return (
    <div className="oo-checkbox-field" style={weightStyle(weight)}>
      <label className="oo-checkbox" data-disabled={disabled ? 'true' : 'false'}>
        <input
          type="checkbox"
          checked={internal}
          disabled={disabled}
          onChange={onChange}
        />
        {label ? (
          <span>
            {label}
            {required ? <span className="oo-field__required">*</span> : null}
          </span>
        ) : null}
      </label>
      <ControlHint text={hint} />
      <ControlError text={error} />
      <Checks checks={checks} />
    </div>
  );
}
