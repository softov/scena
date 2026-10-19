import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { useWriteBack, WriteContext } from '../../react/mount-context.js';
import { TextField } from '../control/TextField.js';
import { CheckBox } from '../control/CheckBox.js';
import { ChoicePicker, type ChoiceOption } from '../control/ChoicePicker.js';
import { FormContext } from './Form.js';
import { Field } from './Field.js';
import { FormSection } from './FormSection.js';
import {
  type EnumOption,
  type JsonSchemaField,
  type JsonSchemaObject,
  cleanDescription,
  deepEqual,
  defaultValueForSchema,
  effectiveType,
  isObjectRecord,
  normalizeUnionOptions,
  resolveArrayItemSchema,
  textareaRows,
} from './schema-walk.js';
import './SchemaForm.css';
import { NAMED_GLYPH } from '../display/Icon.js';
import { Markdown } from '../display/Markdown.js';
import { useI18n } from '../../react/hooks/useI18n.js';

// Custom field renderer keyed by `format`. Domain-coupled renderers (model
// pickers, tool lists, OAuth buttons) live in the consumer (web-next), not in
// scena, and are passed in via `formatRenderers`.
export interface FormatRendererProps {
  value: unknown;
  onChange: (next: unknown) => void;
  field: JsonSchemaField;
  error?: string;
}
export type FormatRenderer = ComponentType<FormatRendererProps>;

// The editor the form's JSON text is written in: the root's `json` mode, a
// nested section's, and a tuple array. A consumer with a code editor passes it
// here; without one the form uses a plain textarea.
export interface JsonEditorProps {
  value: string;
  onChange: (text: string) => void;
}
export type JsonEditor = ComponentType<JsonEditorProps>;

export interface SchemaFormProps {
  schema: JsonSchemaObject;
  // Bound (graph) OR controlled (direct React). Both supply the object here.
  value?: Record<string, unknown>;
  defaultValue?: Record<string, unknown>;
  // Controlled escape hatch for direct React. In bound mode, omit it — changes
  // flow back through the store via useWriteBack.
  onChange?: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  namespace?: string;
  header?: string;
  formatRenderers?: Record<string, FormatRenderer>;
  jsonEditor?: JsonEditor;
  // `fields | json` switch. `jsonTextRoot` toggles it on this form (default
  // true). `jsonTextFields` toggles it on nested object sections; when unset it
  // follows the effective root value, so disabling it here disables children
  // while the root keeps its switch.
  jsonTextRoot?: boolean;
  jsonTextFields?: boolean;
  // Pristine reference for dirty tracking + reset. Defaults to the first value
  // received. Pass a new baseline (alongside a new value) when "loading" a
  // record so the form starts clean against that record.
  baseline?: Record<string, unknown>;
  // Emitted whenever dirtiness (value ≠ baseline) changes.
  onDirtyChange?: (dirty: boolean) => void;
  // Emitted when the form's JSON text, its own or any nested section's or
  // tuple array's, starts or stops parsing. While it does not parse, the value
  // is the last one that did, so a consumer holds its save until this is true.
  onJsonValidChange?: (valid: boolean) => void;
  style?: CSSProperties;
}

// Per-field chrome. Scalar controls render this inside their own <label>;
// composite fields (union/array/format) render it via the Field wrapper.
interface FieldMeta {
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  typeTag?: string;
}

function hasFormatRenderer(field: JsonSchemaField, renderers?: Record<string, FormatRenderer>): boolean {
  return Boolean(field.format && renderers?.[field.format]);
}

export function SchemaForm({
  schema,
  value,
  defaultValue,
  onChange,
  errors,
  namespace,
  header,
  formatRenderers,
  jsonEditor,
  jsonTextRoot,
  jsonTextFields,
  baseline,
  onDirtyChange,
  onJsonValidChange,
  style,
}: SchemaFormProps) {
  const { t } = useI18n();
  const writeValue = useWriteBack('value');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // The outermost form gathers the editors whose text does not parse; a nested
  // one hands its own state up to it.
  const outer = useContext(JsonValidityContext);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(() => new Set());
  const gather = useCallback((id: string, valid: boolean) => {
    setInvalid((current) => {
      if (current.has(id) !== valid) return current;
      const next = new Set(current);
      if (valid) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const report = outer ?? gather;
  const selfId = useId();
  useEffect(() => {
    report(selfId, jsonError === null);
  }, [report, selfId, jsonError]);
  useEffect(() => () => report(selfId, true), [report, selfId]);
  const allValid = invalid.size === 0;
  useEffect(() => {
    if (outer === null) onJsonValidChange?.(allValid);
    // Fires on transitions only, as onDirtyChange does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allValid]);
  const [internal, setInternal] = useState<Record<string, unknown>>(value ?? defaultValue ?? {});
  const [mode, setMode] = useState<'fields' | 'json'>('fields');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value ?? defaultValue ?? {}, null, 2));

  // Root shows its switch unless explicitly disabled. Nested object sections
  // follow `jsonTextFields`, which defaults to the effective root value.
  const showRootToggle = jsonTextRoot ?? true;
  const childToggle = jsonTextFields ?? showRootToggle;

  // Pristine baseline: explicit prop, else the first value this form saw.
  const initialRef = useRef<Record<string, unknown>>(value ?? defaultValue ?? {});
  const baselineValue = baseline ?? initialRef.current;
  const dirty = !deepEqual(internal, baselineValue);

  // The value this form last sent. A `value` that is not it came from outside,
  // as a consumer's reset or the host's own change, and replaces the JSON text,
  // which is otherwise the person's to keep while they edit it.
  const sentRef = useRef<Record<string, unknown> | undefined>(value ?? defaultValue);

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
    if (deepEqual(value, sentRef.current)) return;
    sentRef.current = value;
    setJsonText(JSON.stringify(value, null, 2));
    setJsonError(null);
  }, [value]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    // Fires on dirty transitions only. `onDirtyChange` is excluded on purpose:
    // callers routinely pass an inline arrow, and including it would re-fire
    // the callback on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const properties = schema.properties;
  if (!properties || Object.keys(properties).length === 0) {
    return <div className="oo-schema-form__empty">No parameters defined.</div>;
  }

  const requiredSet = new Set(schema.required ?? []);

  function commit(next: Record<string, unknown>): void {
    sentRef.current = next;
    setInternal(next);
    writeValue(next);   // bound/graph: writes the whole object back (no-op in plain React)
    onChange?.(next);   // controlled: direct-React parent
  }

  function setField(key: string, val: unknown): void {
    commit({ ...internal, [key]: val });
  }

  function enterJson(): void {
    setJsonText(JSON.stringify(internal, null, 2));
    setJsonError(null);
    setMode('json');
  }

  // Leaving the JSON text drops what did not parse; the fields show the value.
  function enterFields(): void {
    setJsonError(null);
    setMode('fields');
  }

  function editJson(text: string): void {
    setJsonText(text);
    const { parsed, error } = jsonProblem(text, isObjectRecord, 'an object');
    setJsonError(error);
    if (error === null) commit(parsed as Record<string, unknown>);
  }

  function reset(): void {
    commit(baselineValue);
    setJsonText(JSON.stringify(baselineValue, null, 2));
    setJsonError(null);
  }

  function renderField(key: string, field: JsonSchemaField): ReactNode {
    // x-show-if — hide unless a sibling field matches.
    const showIf = field['x-show-if'];
    if (showIf && internal[showIf.field] !== showIf.value) return null;

    const type = effectiveType(field);
    const isEnum = (field.enum?.length ?? 0) > 0 || (field['x-enumOptions']?.length ?? 0) > 0;
    const set = (next: unknown) => setField(key, next);
    const meta: FieldMeta = {
      label: field.title ?? key,
      hint: cleanDescription(field.description),
      required: requiredSet.has(key),
      error: errors?.[key],
      typeTag: isEnum ? 'enum' : type,
    };
    const childNamespace = namespace ? `${namespace}_${key}` : undefined;

    // Object → a titled section with a nested form (its fields carry labels).
    if (type === 'object' && !isEnum && !hasFormatRenderer(field, formatRenderers)) {
      return (
        <FormSection key={key} title={meta.label ?? key} {...(meta.hint ? { description: meta.hint } : {})}>
          <SchemaForm
            schema={{ type: 'object', properties: field.properties ?? {}, required: field.required ?? [] }}
            value={isObjectRecord(internal[key]) ? (internal[key] as Record<string, unknown>) : {}}
            baseline={isObjectRecord(baselineValue[key]) ? (baselineValue[key] as Record<string, unknown>) : {}}
            onChange={set}
            namespace={childNamespace}
            formatRenderers={formatRenderers} jsonEditor={jsonEditor}
            jsonTextRoot={childToggle}
          />
        </FormSection>
      );
    }

    // Composite — owns no single focusable input, so Field provides the label.
    const isComposite =
      normalizeUnionOptions(field).length > 0 ||
      type === 'array' ||
      hasFormatRenderer(field, formatRenderers);
    if (isComposite) {
      return (
        <Field key={key} name={key} label={meta.label} hint={meta.hint} required={meta.required} typeTag={meta.typeTag} error={meta.error}>
          <SchemaControl field={field} value={internal[key]} onChange={set} required={meta.required} error={meta.error} namespace={childNamespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} jsonTextFields={childToggle} />
        </Field>
      );
    }

    // Scalar — the control owns its own <label>; pass the chrome straight in.
    return (
      <SchemaControl
        key={key}
        field={field}
        value={internal[key]}
        onChange={set}
        meta={meta}
        required={meta.required}
        error={meta.error}
        namespace={childNamespace}
        formatRenderers={formatRenderers} jsonEditor={jsonEditor}
      />
    );
  }

  const rows = mode === 'fields' ? Object.entries(properties).map(([key, field]) => renderField(key, field)) : null;

  const modebar = showRootToggle || dirty ? (
    <div className="oo-schema-form__modebar">
      {showRootToggle ? (
        <>
          <button type="button" data-active={mode === 'fields'} onClick={enterFields}>{t('form/fields', 'fields')}</button>
          <button type="button" data-active={mode === 'json'} onClick={enterJson}>{t('form/json', 'json')}</button>
        </>
      ) : null}
      {dirty ? (
        <button type="button" className="oo-schema-form__reset" onClick={reset}>reset</button>
      ) : null}
    </div>
  ) : null;

  const body =
    mode === 'json' ? (
      <>
        {jsonEditor ? (
          <JsonEditorBox editor={jsonEditor} value={jsonText} onChange={editJson} />
        ) : (
          <textarea
            className="oo-schema-form__json"
            value={jsonText}
            spellCheck={false}
            rows={16}
            onChange={(e) => editJson(e.target.value)}
          />
        )}
        <JsonError error={jsonError} />
      </>
    ) : header ? (
      <FormSection title={header}>{rows}</FormSection>
    ) : (
      rows
    );

  // Suppress ambient write-back for the field controls: each control reports
  // through its explicit onChange, and SchemaForm aggregates into one object.
  return (
    <FormContext.Provider value={{ errors, namespace }}>
      <WriteContext.Provider value={null}>
        <JsonValidityContext.Provider value={report}>
          <div className="oo-schema-form" style={style}>
            {schema.description ? <Markdown text={schema.description} /> : null}
            {modebar}
            {body}
          </div>
        </JsonValidityContext.Provider>
      </WriteContext.Provider>
    </FormContext.Provider>
  );
}

// ── Per-field type dispatch (internal; not exported / not registered) ────────
//
// `meta` is set only for top-level scalar fields, where the control owns its
// label. For nested controls (array items, union sub-schema) and composite
// fields wrapped in Field, meta is undefined and the control renders bare.

interface SchemaControlProps {
  field: JsonSchemaField;
  value: unknown;
  onChange: (next: unknown) => void;
  meta?: FieldMeta;
  required?: boolean;
  error?: string;
  namespace?: string;
  formatRenderers?: Record<string, FormatRenderer>;
  jsonEditor?: JsonEditor;
  // Whether nested object forms rendered by this control show their switch.
  jsonTextFields?: boolean;
}

function SchemaControl({ field, value, onChange, meta, required, error, namespace, formatRenderers, jsonEditor, jsonTextFields }: SchemaControlProps) {
  const { t } = useI18n();
  const unionOptions = normalizeUnionOptions(field);
  const [unionIndex, setUnionIndex] = useState(0);

  // Union (oneOf / anyOf): pick a variant, then render its sub-schema.
  if (unionOptions.length > 0) {
    const idx = unionOptions[unionIndex] ? unionIndex : 0;
    const current = unionOptions[idx] ?? unionOptions[0]!;
    const options: ChoiceOption[] = unionOptions.map((opt, i) => {
      const t = effectiveType(opt);
      const enumLabel =
        opt.const !== undefined
          ? String(opt.const)
          : opt.enum && opt.enum.length === 1
            ? opt.enum[0]!
            : opt.title ?? t;
      return { value: String(i), label: opt.title ? `${opt.title} (${enumLabel})` : enumLabel };
    });
    return (
      <div className="oo-schema-form__union">
        <ChoicePicker
          options={options}
          value={String(idx)}
          onChange={(v) => {
            const next = Number(v);
            const safe = Number.isFinite(next) ? Math.max(0, Math.min(next, unionOptions.length - 1)) : 0;
            setUnionIndex(safe);
            onChange(defaultValueForSchema(unionOptions[safe]!));
          }}
        />
        <SchemaControl field={current} value={value} onChange={onChange} namespace={namespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} jsonTextFields={jsonTextFields} />
      </div>
    );
  }

  // Custom format renderer — checked before the built-in dispatch.
  if (field.format && formatRenderers?.[field.format]) {
    const Renderer = formatRenderers[field.format]!;
    return <Renderer value={value} onChange={onChange} field={field} error={error} />;
  }

  const type = effectiveType(field);

  // Enum / rich enum → ChoicePicker (owns its label via meta).
  if ((field.enum && field.enum.length > 0) || (field['x-enumOptions'] && field['x-enumOptions'].length > 0)) {
    const rich: EnumOption[] | undefined = field['x-enumOptions'];
    const options: ChoiceOption[] = rich
      ? rich.map((o) => ({ value: o.value, label: o.description ? `${o.label} — ${o.description}` : o.label }))
      : (field.enum ?? []);
    const withPlaceholder: ChoiceOption[] = required
      ? options
      : [{ value: '', label: t('form/select', 'Select…') }, ...options];
    return (
      <ChoicePicker
        options={withPlaceholder}
        value={String(value ?? field.default ?? '')}
        onChange={(v) => onChange(v)}
        label={meta?.label}
        hint={meta?.hint}
        error={meta?.error}
        required={meta?.required}
        typeTag={meta?.typeTag}
      />
    );
  }

  if (type === 'boolean') {
    return (
      <CheckBox
        value={Boolean(value ?? field.default ?? false)}
        onChange={(v) => onChange(v)}
        label={meta?.label}
        hint={meta?.hint}
        error={meta?.error}
        required={meta?.required}
      />
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <TextField
        type="number"
        value={value !== undefined ? String(value) : ''}
        min={field.minimum}
        max={field.maximum}
        onChange={(s) => onChange(s === '' ? undefined : Number(s))}
        label={meta?.label}
        hint={meta?.hint}
        error={meta?.error}
        required={meta?.required}
        typeTag={meta?.typeTag}
      />
    );
  }

  if (type === 'color') {
    return (
      <TextField
        type="color"
        value={value !== undefined ? String(value) : ''}
        min={field.minimum}
        max={field.maximum}
        onChange={(s) => onChange(s === '' ? undefined : Number(s))}
        label={meta?.label}
        hint={meta?.hint}
        error={meta?.error}
        required={meta?.required}
        typeTag={meta?.typeTag}
      />
    );
  }

  if (type === 'array') {
    return <ArrayControl field={field} value={value} onChange={onChange} namespace={namespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} jsonTextFields={jsonTextFields} />;
  }

  if (type === 'object') {
    return (
      <SchemaForm
        schema={{ type: 'object', properties: field.properties ?? {}, required: field.required ?? [] }}
        value={isObjectRecord(value) ? value : {}}
        onChange={(next) => onChange(next)}
        namespace={namespace}
        formatRenderers={formatRenderers} jsonEditor={jsonEditor}
        jsonTextRoot={jsonTextFields}
      />
    );
  }

  // string (default), with password + textarea variants.
  const rows = textareaRows(field);
  return (
    <TextField
      type={field.format === 'password' ? 'password' : 'text'}
      multiline={rows !== null}
      rows={rows ?? undefined}
      value={String(value ?? field.default ?? '')}
      onChange={(s) => onChange(s)}
      label={meta?.label}
      hint={meta?.hint}
      error={meta?.error}
      required={meta?.required}
      typeTag={meta?.typeTag}
    />
  );
}

// ── JSON validity, gathered at the outermost form ──────────────────────────

// Each JSON editor in a form reports under its own id whether its text parses;
// the outermost SchemaForm holds the ones that do not and tells its consumer.
const JsonValidityContext = createContext<((id: string, valid: boolean) => void) | null>(null);

/** Reports `error === null` to the form's gatherer while mounted, and valid when unmounted. */
function useJsonValidity(error: string | null): void {
  const report = useContext(JsonValidityContext);
  const id = useId();
  useEffect(() => {
    report?.(id, error === null);
  }, [report, id, error]);
  useEffect(() => () => report?.(id, true), [report, id]);
}

/** Why a JSON text is not the value it should be, or null when it is. */
function jsonProblem(text: string, fits: (parsed: unknown) => boolean, shape: string): { parsed: unknown; error: string | null } {
  try {
    const parsed = JSON.parse(text) as unknown;
    return fits(parsed) ? { parsed, error: null } : { parsed, error: `The JSON must be ${shape}.` };
  } catch (error) {
    return { parsed: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}

function JsonError({ error }: { error: string | null }) {
  return error === null ? null : <p className="oo-schema-form__json-error" role="alert">{error}</p>;
}

// ── The consumer's JSON editor ─────────────────────────────────────────────

function JsonEditorBox({ editor: Editor, value, onChange }: { editor: JsonEditor; value: string; onChange: (text: string) => void }) {
  return (
    <div className="oo-schema-form__json-editor">
      <Editor value={value} onChange={onChange} />
    </div>
  );
}

// A tuple array as JSON text. It holds the text it shows, so a draft that does
// not parse stays on screen with its error instead of snapping back.
function TupleJson({ items, onChange, jsonEditor }: { items: unknown[]; onChange: (next: unknown) => void; jsonEditor?: JsonEditor }) {
  const shown = JSON.stringify(items, null, 2);
  const [text, setText] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  // The value this editor last sent; any other value came from outside, as a reset, and replaces the text.
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
    const problem = jsonProblem(next, Array.isArray, 'an array');
    setError(problem.error);
    if (problem.error !== null) return;
    sent.current = JSON.stringify(problem.parsed, null, 2);
    onChange(problem.parsed);
  };
  return (
    <>
      {jsonEditor ? <JsonEditorBox editor={jsonEditor} value={text} onChange={edit} /> : <TextField multiline rows={5} value={text} onChange={edit} />}
      <JsonError error={error} />
    </>
  );
}

// ── Array repeater ──────────────────────────────────────────────────────────

interface ArrayControlProps {
  field: JsonSchemaField;
  value: unknown;
  onChange: (next: unknown) => void;
  namespace?: string;
  formatRenderers?: Record<string, FormatRenderer>;
  jsonEditor?: JsonEditor;
  jsonTextFields?: boolean;
}

function ArrayControl({ field, value, onChange, namespace, formatRenderers, jsonEditor, jsonTextFields }: ArrayControlProps) {
  const { t } = useI18n();
  const items = Array.isArray(value) ? value : [];
  const itemSchema = resolveArrayItemSchema(field);

  // Tuple arrays — edited as raw JSON.
  if (!itemSchema) return <TupleJson items={items} onChange={onChange} jsonEditor={jsonEditor} />;

  return (
    <div className="oo-schema-form__array">
      {items.map((item, index) => (
        <div className="oo-schema-form__array-item" key={index}>
          <div className="oo-schema-form__array-control">
            <SchemaControl
              field={itemSchema}
              value={item}
              onChange={(next) => onChange(items.map((it, i) => (i === index ? next : it)))}
              namespace={namespace}
              formatRenderers={formatRenderers} jsonEditor={jsonEditor}
              jsonTextFields={jsonTextFields}
            />
          </div>
          <button
            type="button"
            className="oo-schema-form__array-remove"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            aria-label={t('form/removeItem', 'Remove item')}
          >
            {NAMED_GLYPH.closePanel}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="oo-btn oo-schema-form__array-add"
        onClick={() => onChange([...items, defaultValueForSchema(itemSchema)])}
      >
        {t('form/addItem', '+ add item')}
      </button>
    </div>
  );
}
