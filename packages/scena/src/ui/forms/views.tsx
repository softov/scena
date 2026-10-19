import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { FormSection } from './FormSection.js';
import { JsonEditorBox, JsonError, jsonProblem, useJsonValidity } from './json-text.js';
import { isObjectRecord, type JsonSchemaObject } from './schema-walk.js';
import type { JsonEditor } from './SchemaForm.js';

// What a view is handed. The form holds the value, the baseline and the active
// view; a view only draws them, and draws a field through `renderField`, so
// every view uses the form's own controls (and its field actions).
export interface SchemaFormViewProps {
  schema: JsonSchemaObject;
  // The schema's top-level keys, in its order.
  keys: string[];
  value: Record<string, unknown>;
  baseline: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  // The field under `key`, with its label and chrome; null when `x-show-if` hides it.
  renderField: (key: string) => ReactNode;
  header?: string;
  jsonEditor?: JsonEditor;
  setView: (id: string) => void;
  hasView: (id: string) => boolean;
}

// One way to look at a form's value. The modebar draws one button per view,
// labelled `label`, else the translation of `form/<id>`.
export interface SchemaFormView {
  id: string;
  label?: string;
  render: ComponentType<SchemaFormViewProps>;
}

function FieldsView({ keys, renderField, header }: SchemaFormViewProps) {
  const rows = keys.map((key) => renderField(key));
  return header ? <FormSection title={header}>{rows}</FormSection> : <>{rows}</>;
}

// The value as JSON text. It holds the text it shows, so a draft that does not
// parse stays on screen with its error; a value it did not send replaces the
// text, as a consumer's reset or the host's own change.
function JsonView({ value, onChange, jsonEditor }: SchemaFormViewProps) {
  const shown = JSON.stringify(value, null, 2);
  const [text, setText] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  const sent = useRef<string>(shown);
  useEffect(() => {
    if (shown === sent.current) return;
    sent.current = shown;
    setText(shown);
    setError(null);
  }, [shown]);
  useJsonValidity(error);
  const edit = (next: string): void => {
    setText(next);
    const problem = jsonProblem(next, isObjectRecord, 'an object');
    setError(problem.error);
    if (problem.error !== null) return;
    sent.current = JSON.stringify(problem.parsed, null, 2);
    onChange(problem.parsed as Record<string, unknown>);
  };
  return (
    <>
      {jsonEditor ? (
        <JsonEditorBox editor={jsonEditor} value={text} onChange={edit} />
      ) : (
        <textarea className="oo-schema-form__json" value={text} spellCheck={false} rows={16} onChange={(event) => edit(event.target.value)} />
      )}
      <JsonError error={error} />
    </>
  );
}

export const fieldsView: SchemaFormView = { id: 'fields', render: FieldsView };
export const jsonView: SchemaFormView = { id: 'json', render: JsonView };
