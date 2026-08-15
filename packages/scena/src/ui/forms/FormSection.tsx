import type { ReactNode } from 'react';
import './FormSection.css';

export interface FormSectionProps {
  title: string;
  children?: ReactNode;
}

// Section header (uppercase title + bottom border) + its fields. This is the
// `x-header` pattern from web's JsonSchemaForm.
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="oo-form-section">
      <header className="oo-form-section__header">{title}</header>
      <div className="oo-form-section__body">{children}</div>
    </section>
  );
}
