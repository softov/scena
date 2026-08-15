import type { ReactNode } from 'react';
import { useFormContext } from './Form.js';
import './Field.css';

// FieldLabel / FieldError / FieldHint are internal parts of Field — the same
// way Checks is an internal part of every control. They are exported for
// hand-composed React forms but are NOT registered as catalog components.

export interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
  typeTag?: string;
}

export function FieldLabel({ htmlFor, label, required, typeTag }: FieldLabelProps) {
  return (
    <span className="oo-field-row__labelline">
      <label className="oo-field-row__label" htmlFor={htmlFor}>
        {label}
      </label>
      {required ? <span className="oo-field__required oo-field-row__required">*</span> : null}
      {typeTag ? <span className="oo-field-row__type">{typeTag}</span> : null}
    </span>
  );
}

export interface FieldHintProps {
  text?: string;
}

export function FieldHint({ text }: FieldHintProps) {
  if (!text) return null;
  return <span className="oo-field__hint oo-field-row__hint">{text}</span>;
}

export interface FieldErrorProps {
  name?: string;
  error?: string;
}

export function FieldError({ name, error }: FieldErrorProps) {
  const { errors } = useFormContext();
  const message = error ?? (name ? errors?.[name] : undefined);
  if (!message) return null;
  return <span className="oo-field__error oo-field-row__error">{message}</span>;
}

export interface FieldProps {
  name: string;          // field key — used for error lookup in FormContext
  label?: string;
  hint?: string;
  required?: boolean;
  typeTag?: string;      // monospace type chip ('array','object',…)
  error?: string;        // explicit; else pulled from FormContext by name
  children?: ReactNode;  // the content (array repeater, custom renderer, …)
}

// A field ROW for content that owns no single focusable input — array
// repeaters, custom format renderers, union pickers. The heading is a <span>,
// not a <label> (there is no input to associate). Scalar controls do NOT use
// Field: they render their own <label> via the control's field chrome.
export function Field({ name, label, hint, required, typeTag, error, children }: FieldProps) {
  return (
    <div className="oo-field-row">
      {label ? (
        <span className="oo-field-row__labelline">
          <span className="oo-field-row__label">{label}</span>
          {required ? <span className="oo-field__required oo-field-row__required">*</span> : null}
          {typeTag ? <span className="oo-field__type oo-field-row__type">{typeTag}</span> : null}
        </span>
      ) : null}
      <FieldHint text={hint} />
      <div className="oo-field-row__control">{children}</div>
      <FieldError name={name} error={error} />
    </div>
  );
}
