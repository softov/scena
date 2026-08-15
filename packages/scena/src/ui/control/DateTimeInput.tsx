import { type ChangeEvent, useEffect, useState } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { weightStyle } from '../_utils.js';
import { Checks, type CheckRuleResolved } from './Checks.js';
import { ControlLabel, ControlHint, ControlError } from './_field-parts.js';
import './DateTimeInput.css';
// DateTimeInput reuses .oo-field + .oo-input from TextField's CSS.
import './TextField.css';

// a2ui v0.10: required `value`. optional `enableDate` (bool def false),
// `enableTime` (bool def false), `min`, `max`, `label`. scena's `mode` enum
// is a transitional shape — when set it drives a single HTML input type;
// when unset, `enableDate` + `enableTime` derive the type per spec.
export interface DateTimeInputProps {
  value?: string;
  enableDate?: boolean;       // a2ui v0.10
  enableTime?: boolean;       // a2ui v0.10
  label?: string;
  min?: string;
  max?: string;
  weight?: number;            // a2ui CatalogComponentCommon
  // scena extensions:
  defaultValue?: string;
  mode?: 'date' | 'time' | 'datetime';
  disabled?: boolean;
  checks?: CheckRuleResolved[];
  // Field chrome — rendered inside the control's own <label>.
  hint?: string;
  error?: string;
  required?: boolean;
  typeTag?: string;
  // Controlled escape hatch for direct-React use. Fires alongside write-back.
  onChange?: (next: string) => void;
}

function deriveType(opts: { mode?: string; enableDate?: boolean; enableTime?: boolean }): string {
  if (opts.mode === 'date') return 'date';
  if (opts.mode === 'time') return 'time';
  if (opts.mode === 'datetime') return 'datetime-local';
  // From enableDate / enableTime per spec:
  if (opts.enableDate && opts.enableTime) return 'datetime-local';
  if (opts.enableTime) return 'time';
  if (opts.enableDate) return 'date';
  return 'datetime-local';   // sensible scena fallback
}

export function DateTimeInput({
  value,
  defaultValue,
  mode,
  enableDate,
  enableTime,
  min,
  max,
  label,
  disabled,
  weight,
  checks,
  hint,
  error,
  required,
  typeTag,
  onChange: onChangeProp,
}: DateTimeInputProps) {
  const writeValue = useWriteBack('value');
  const [internal, setInternal] = useState<string>(value ?? defaultValue ?? '');

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const next = e.currentTarget.value;
    setInternal(next);
    writeValue(next);
    onChangeProp?.(next);
  }

  return (
    <label className="oo-field" style={weightStyle(weight)}>
      <ControlLabel label={label} required={required} typeTag={typeTag} />
      <ControlHint text={hint} />
      <div className="oo-control">
        <input
          className="oo-input"
          type={deriveType({ mode, enableDate, enableTime })}
          value={internal}
          min={min}
          max={max}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
      <ControlError text={error} />
      <Checks checks={checks} />
    </label>
  );
}
