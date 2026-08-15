import { type ChangeEvent, useEffect, useId, useState } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { weightStyle } from '../_utils.js';
import { Checks, type CheckRuleResolved } from './Checks.js';
import { ControlLabel, ControlHint, ControlError } from './_field-parts.js';
import './TextField.css';

export type InputType = React.HTMLInputTypeAttribute;
// a2ui v0.10: required `label`. variant ∈ longText/number/shortText/obscured
// (scena maps via `type` + `multiline` — Group D mental-model divergence
// deferred). `weight` added.
export interface TextFieldProps {
  id?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  weight?: number;
  // scena extensions:
  defaultValue?: string;
  type?: InputType;
  disabled?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  checks?: CheckRuleResolved[];
  // Field chrome — rendered inside the control's own <label> so there is one
  // label per field. SchemaForm passes these; standalone callers can too.
  hint?: string;
  error?: string;
  required?: boolean;
  typeTag?: string;
  // Controlled escape hatch for direct-React use (outside a mount, where
  // useWriteBack no-ops). Fires alongside write-back.
  onChange?: (next: string) => void;
}

// function getClearId(id?: string, label?: string): string {
//   const base = id ?? label ?? Math.random().toString(16).slice(2, 8);
//   return base.replace(/[^a-zA-Z0-9_-]/g, '');
// }

// Bidirectional: pushes user input through useWriteBack('value'). When
// `value` resolved from a DataBinding, the write-back lands in the store
// and the next render reflects it. When `value` was a literal, write-back
// silently no-ops and the field keeps its internal state.
export function TextField({
  // id: idProps,
  value,
  defaultValue,
  placeholder,
  label,
  type = 'text',
  disabled,
  readOnly,
  multiline,
  rows = 3,
  min,
  max,
  checks,
  weight,
  hint,
  error,
  required,
  typeTag,
  onChange: onChangeProp,
}: TextFieldProps) {
  // const id = `oo-${getClearId(idProps, label)}`;
  const id = useId();
  const writeValue = useWriteBack('value');
  const [internal, setInternal] = useState<string>(value ?? defaultValue ?? '');

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const next = e.currentTarget.value;
    setInternal(next);
    writeValue(next);
    onChangeProp?.(next);
  }

  const wrapperStyle = weightStyle(weight);
  return (
    <label className="oo-field" htmlFor={id} style={wrapperStyle}>
      <ControlLabel label={label} required={required} typeTag={typeTag} />
      <ControlHint text={hint} />
      <div className="oo-control">
        {multiline ? (
          <textarea
            id={id}
            className="oo-textarea"
            value={internal}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            rows={rows}
            onChange={onChange}
          />
        ) : (
          <input
            id={id}
            className="oo-input"
            type={type}
            value={internal}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            onChange={onChange}
            min={type === 'number' ? min : undefined}
            max={type === 'number' ? max : undefined}
          />
        )}
      </div>
      <ControlError text={error} />
      <Checks checks={checks} />
    </label>
  );
}
