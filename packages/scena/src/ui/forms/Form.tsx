import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import './Form.css';

// Shared form context — Field reads `errors` (by field name) and `namespace`
// (for label id prefixing) from here so callers don't thread them per-field.
export interface FormContextValue {
  errors?: Record<string, string>;
  namespace?: string;
}

export const FormContext = createContext<FormContextValue>({});

export function useFormContext(): FormContextValue {
  return useContext(FormContext);
}

export interface FormProps {
  children?: ReactNode;
  errors?: Record<string, string>;
  namespace?: string;
  gap?: number | string;
  // Sets `data-loading="true"` on the root for async-load styling (e.g. while
  // a record is being fetched into the form).
  loading?: boolean;
  // Direct-React submit. Graph-authored forms submit via a Button Action
  // instead, so this stays optional.
  onSubmit?: () => void;
  style?: CSSProperties;
}

export function Form({ children, errors, namespace, gap, loading, onSubmit, style }: FormProps) {
  const formStyle: CSSProperties = {
    ...(gap !== undefined ? { gap } : null),
    ...style,
  };
  return (
    <FormContext.Provider value={{ errors, namespace }}>
      <form
        className="oo-form"
        data-loading={loading ? 'true' : undefined}
        style={formStyle}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}
