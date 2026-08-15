import type { ReactNode } from 'react';
import './FieldGroup.css';

export interface FieldGroupProps {
  legend?: string;
  children?: ReactNode;
}

// Fieldset-style grouping of related fields. No header border (that is
// FormSection's job) — just an optional legend and a bordered box.
export function FieldGroup({ legend, children }: FieldGroupProps) {
  return (
    <fieldset className="oo-field-group">
      {legend ? <legend className="oo-field-group__legend">{legend}</legend> : null}
      {children}
    </fieldset>
  );
}
