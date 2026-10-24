import type { ReactNode } from 'react';
import { Markdown } from '../display/Markdown.js';
import './_field-parts.css';

// Shared field chrome for the controls. All <span>s so they are valid inside a
// control's own <label> wrapper (a <label> cannot nest another <label>). The
// control owns the single <label>; these just fill in the label line, hint and
// error. Kept in control/ so controls never import from forms/.

export interface ControlLabelProps {
  label?: string;
  required?: boolean;
  typeTag?: string;
  extra?: ReactNode;   // e.g. Slider's live value
}

export function ControlLabel({ label, required, typeTag, extra }: ControlLabelProps) {
  if (!label && !extra) return null;
  return (
    <span className="oo-field__label">
      {label}
      {required ? <span className="oo-field__required">*</span> : null}
      {typeTag ? <span className="oo-field__type">{typeTag}</span> : null}
      {extra}
    </span>
  );
}

// A hint is Markdown: a schema's description often carries steps, emphasis or
// a link. A plain sentence renders as one paragraph, as before.
export function ControlHint({ text }: { text?: string }) {
  if (!text) return null;
  return <Markdown text={text} className="oo-field__hint" />;
}

export function ControlError({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="oo-field__error">{text}</span>;
}
