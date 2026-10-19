import { createContext, useContext, useEffect, useId } from 'react';
import type { JsonEditor } from './SchemaForm.js';

// Each JSON editor in a form reports under its own id whether its text parses;
// the outermost SchemaForm holds the ones that do not and tells its consumer.
export const JsonValidityContext = createContext<((id: string, valid: boolean) => void) | null>(null);

/** Reports `error === null` to the form's gatherer while mounted, and valid when unmounted. */
export function useJsonValidity(error: string | null): void {
  const report = useContext(JsonValidityContext);
  const id = useId();
  useEffect(() => {
    report?.(id, error === null);
  }, [report, id, error]);
  useEffect(() => () => report?.(id, true), [report, id]);
}

/** Why a JSON text is not the value it should be, or null when it is. */
export function jsonProblem(text: string, fits: (parsed: unknown) => boolean, shape: string): { parsed: unknown; error: string | null } {
  try {
    const parsed = JSON.parse(text) as unknown;
    return fits(parsed) ? { parsed, error: null } : { parsed, error: `The JSON must be ${shape}.` };
  } catch (error) {
    return { parsed: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}

export function JsonError({ error }: { error: string | null }) {
  return error === null ? null : <p className="oo-schema-form__json-error" role="alert">{error}</p>;
}

// The consumer's JSON editor, in a box the form sizes.
export function JsonEditorBox({ editor: Editor, value, onChange }: { editor: JsonEditor; value: string; onChange: (text: string) => void }) {
  return (
    <div className="oo-schema-form__json-editor">
      <Editor value={value} onChange={onChange} />
    </div>
  );
}
