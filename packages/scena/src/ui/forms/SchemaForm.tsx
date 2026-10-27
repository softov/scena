import { useCallback, useContext, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
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
  allowedKeys,
  cleanDescription,
  deepEqual,
  defaultValueForSchema,
  effectiveType,
  isAnyValue,
  isObjectRecord,
  mapValueSchema,
  normalizeUnionOptions,
  objectSchema,
  resolveArrayItemSchema,
  resolveConditionals,
  textareaRows,
  unionIndexOf,
} from './schema-walk.js';
import './SchemaForm.css';
import { NAMED_GLYPH } from '../display/Icon.js';
import { Markdown } from '../display/Markdown.js';
import { JsonEditorBox, JsonError, JsonValidityContext, jsonProblem, useJsonValidity } from './json-text.js';
import { fieldsView, jsonView, type SchemaFormView } from './views.js';
import { FieldRow } from './FieldRow.js';

// The views a form offers when it is given none.
const DEFAULT_VIEWS: SchemaFormView[] = [fieldsView, jsonView];
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
  // The ways to look at the value, one modebar button each. Default
  // `[fieldsView, jsonView]`. Nested object sections get the same views.
  views?: SchemaFormView[];
  // The view the form opens on; the first view when unset.
  defaultView?: string;
  onViewChange?: (id: string) => void;
  // The view switch. `jsonTextRoot` toggles it on this form (default
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
  // Each top-level field shows its key in a tooltip and offers a gear menu:
  // reset (takes the key out of the value), copy its key or its JSON, show the
  // JSON view. Off by default.
  fieldActions?: boolean;
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

// Nothing typed: no value, an empty text, list or object.
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return isObjectRecord(value) && Object.keys(value).length === 0;
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
  views,
  defaultView,
  onViewChange,
  jsonTextRoot,
  jsonTextFields,
  baseline,
  onDirtyChange,
  onJsonValidChange,
  fieldActions,
  style,
}: SchemaFormProps) {
  const { t } = useI18n();
  const writeValue = useWriteBack('value');

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
  const allValid = invalid.size === 0;
  useEffect(() => {
    if (outer === null) onJsonValidChange?.(allValid);
    // Fires on transitions only, as onDirtyChange does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allValid]);
  const [internal, setInternal] = useState<Record<string, unknown>>(value ?? defaultValue ?? {});
  const viewList = views ?? DEFAULT_VIEWS;
  const [viewId, setViewId] = useState(() => defaultView ?? viewList[0]?.id ?? 'fields');
  const activeView = viewList.find((one) => one.id === viewId) ?? viewList[0] ?? fieldsView;

  // Root shows its switch unless explicitly disabled. Nested object sections
  // follow `jsonTextFields`, which defaults to the effective root value.
  const showRootToggle = jsonTextRoot ?? true;
  const childToggle = jsonTextFields ?? showRootToggle;

  // Pristine baseline: explicit prop, else the first value this form saw.
  const initialRef = useRef<Record<string, unknown>>(value ?? defaultValue ?? {});
  const baselineValue = baseline ?? initialRef.current;
  const dirty = !deepEqual(internal, baselineValue);

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  useEffect(() => {
    onDirtyChange?.(dirty);
    // Fires on dirty transitions only. `onDirtyChange` is excluded on purpose:
    // callers routinely pass an inline arrow, and including it would re-fire
    // the callback on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // The schema as it holds for the value now: a condition the value meets
  // narrows it (fewer choices, fewer keys), and changing the value redraws it.
  const resolved = resolveConditionals(schema, internal);
  const properties = resolved.properties ?? {};
  // A map names no keys of its own: each other key is the person's, and holds this.
  const mapValue = mapValueSchema(resolved);
  if (Object.keys(properties).length === 0 && mapValue === undefined) {
    return <div className="oo-schema-form__empty">No parameters defined.</div>;
  }

  const requiredSet = new Set(resolved.required ?? []);
  const allowed = allowedKeys(resolved);

  // What the value holds that the schema no longer allows, as a choice left
  // outside a narrowed enum or a key the object does not take. It stays on
  // screen with its error, so a person sees it and can take it out.
  function problemOf(key: string, field: JsonSchemaField): string | undefined {
    if (!Object.hasOwn(internal, key)) return undefined;
    if (allowed !== undefined && !allowed.includes(key)) return t('form/notAllowed', 'Not allowed here. Take it out.');
    const held = internal[key];
    if (field.enum !== undefined && held !== undefined && held !== '' && !field.enum.includes(String(held))) {
      return t('form/notAChoice', 'Not one of the choices here.');
    }
    return undefined;
  }

  function commit(next: Record<string, unknown>): void {
    setInternal(next);
    writeValue(next);   // bound/graph: writes the whole object back (no-op in plain React)
    onChange?.(next);   // controlled: direct-React parent
  }

  function setField(key: string, val: unknown): void {
    // A key the schema does not allow goes once it is emptied, which is how a
    // person takes it out.
    const allows = allowedKeys(resolveConditionals(schema, internal));
    if (allows !== undefined && !allows.includes(key) && isEmptyValue(val)) {
      const next = { ...internal };
      delete next[key];
      commit(next);
      return;
    }
    commit({ ...internal, [key]: val });
  }

  // Leaving the JSON view drops what did not parse; the next view shows the value.
  function showView(id: string): void {
    if (!viewList.some((one) => one.id === id) || id === activeView.id) return;
    setViewId(id);
    onViewChange?.(id);
  }

  function reset(): void {
    commit(baselineValue);
  }

  function renderField(key: string, field: JsonSchemaField): ReactNode {
    const control = renderControl(key, field);
    if (!fieldActions || control === null) return control;
    const inValue = Object.hasOwn(internal, key);
    return (
      <FieldRow
        key={key}
        fieldKey={key}
        value={inValue ? internal[key] : field.default}
        inValue={inValue}
        onReset={() => {
          const next = { ...internal };
          delete next[key];
          commit(next);
        }}
        {...(viewList.some((one) => one.id === 'json') ? { onShowJson: () => showView('json') } : {})}
      >
        {control}
      </FieldRow>
    );
  }

  function renderControl(key: string, field: JsonSchemaField): ReactNode {
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
      error: errors?.[key] ?? problemOf(key, field),
      typeTag: isEnum ? 'enum' : type,
    };
    const childNamespace = namespace ? `${namespace}_${key}` : undefined;

    // Object → a titled section with a nested form (its fields carry labels).
    if (type === 'object' && !isEnum && !hasFormatRenderer(field, formatRenderers)) {
      return (
        <FormSection key={key} title={meta.label ?? key} {...(meta.hint ? { description: meta.hint } : {})}>
          <SchemaForm
            schema={objectSchema(field)}
            value={isObjectRecord(internal[key]) ? (internal[key] as Record<string, unknown>) : {}}
            baseline={isObjectRecord(baselineValue[key]) ? (baselineValue[key] as Record<string, unknown>) : {}}
            onChange={set}
            namespace={childNamespace}
            formatRenderers={formatRenderers} jsonEditor={jsonEditor}
            views={views}
            jsonTextRoot={childToggle}
          />
        </FormSection>
      );
    }

    // Composite — owns no single focusable input, so Field provides the label.
    const isComposite =
      isAnyValue(field) ||
      normalizeUnionOptions(field).length > 0 ||
      type === 'array' ||
      hasFormatRenderer(field, formatRenderers);
    if (isComposite) {
      return (
        <Field key={key} name={key} label={meta.label} hint={meta.hint} required={meta.required} typeTag={meta.typeTag} error={meta.error}>
          <SchemaControl field={field} value={internal[key]} onChange={set} required={meta.required} error={meta.error} namespace={childNamespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} views={views} jsonTextFields={childToggle} />
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
        views={views}
      />
    );
  }

  // A key the schema does not allow is drawn only while the value holds it.
  const keys = Object.keys(properties).filter((key) => allowed === undefined || allowed.includes(key) || Object.hasOwn(internal, key));
  const drawField = (key: string): ReactNode => {
    const field = properties[key];
    return field === undefined ? null : renderField(key, field);
  };

  const modebar = showRootToggle || dirty ? (
    <div className="oo-schema-form__modebar">
      {showRootToggle
        ? viewList.map((one) => (
            <button key={one.id} type="button" data-active={one.id === activeView.id} onClick={() => showView(one.id)}>
              {one.label ?? t(`form/${one.id}`, one.id)}
            </button>
          ))
        : null}
      {dirty ? (
        <button type="button" className="oo-schema-form__reset" onClick={reset}>reset</button>
      ) : null}
    </div>
  ) : null;

  const View = activeView.render;
  const body = (
    <View
      schema={resolved}
      keys={keys}
      value={internal}
      baseline={baselineValue}
      onChange={commit}
      renderField={drawField}
      header={header}
      jsonEditor={jsonEditor}
      setView={showView}
      hasView={(id) => viewList.some((one) => one.id === id)}
    />
  );
  // Only the fields view draws fields; every other view holds the whole value, map keys included.
  const mapRows = mapValue !== undefined && activeView.id === fieldsView.id ? (
    <MapControl
      valueSchema={mapValue}
      value={internal}
      named={Object.keys(properties)}
      onChange={commit}
      namespace={namespace}
      formatRenderers={formatRenderers}
      jsonEditor={jsonEditor}
      views={views}
      jsonTextFields={childToggle}
    />
  ) : null;

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
            {mapRows}
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
  // The views nested object forms rendered by this control offer.
  views?: SchemaFormView[];
  // Whether nested object forms rendered by this control show their switch.
  jsonTextFields?: boolean;
}

function SchemaControl({ field, value, onChange, meta, required, error, namespace, formatRenderers, jsonEditor, views, jsonTextFields }: SchemaControlProps) {
  const { t } = useI18n();
  const unionOptions = normalizeUnionOptions(field);
  const [unionIndex, setUnionIndex] = useState(() => unionIndexOf(unionOptions, value));

  // Union (oneOf / anyOf): pick a variant, then render its sub-schema.
  if (unionOptions.length > 0) {
    const idx = unionOptions[unionIndex] ? unionIndex : 0;
    const current = unionOptions[idx] ?? unionOptions[0]!;
    const options: ChoiceOption[] = unionOptions.map((opt, i) => {
      const t = effectiveType(opt);
      // An object option with no title is named by its keys, so two read apart.
      const keys = opt.properties ? Object.keys(opt.properties) : [];
      const enumLabel =
        opt.const !== undefined
          ? String(opt.const)
          : opt.enum && opt.enum.length === 1
            ? opt.enum[0]!
            : opt.title ?? (t === 'object' && keys.length > 0 ? `{ ${keys.join(', ')} }` : t);
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
        <SchemaControl field={current} value={value} onChange={onChange} namespace={namespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} views={views} jsonTextFields={jsonTextFields} />
      </div>
    );
  }

  // Custom format renderer — checked before the built-in dispatch.
  if (field.format && formatRenderers?.[field.format]) {
    const Renderer = formatRenderers[field.format]!;
    return <Renderer value={value} onChange={onChange} field={field} error={error} />;
  }

  // `{}` is any JSON value, so only its JSON text can hold it.
  if (isAnyValue(field)) {
    return <JsonText value={value} fits={() => true} shape="JSON" onChange={onChange} jsonEditor={jsonEditor} fitRows />;
  }

  const type = effectiveType(field);

  // `null` is the whole value: there is nothing to type.
  if (type === 'null') return null;

  // Enum / rich enum → ChoicePicker (owns its label via meta).
  if ((field.enum && field.enum.length > 0) || (field['x-enumOptions'] && field['x-enumOptions'].length > 0)) {
    const rich: EnumOption[] | undefined = field['x-enumOptions'];
    const options: ChoiceOption[] = rich
      ? rich.map((o) => ({ value: o.value, label: o.description ? `${o.label} — ${o.description}` : o.label }))
      : (field.enum ?? []);
    // A held value a narrowed enum left out stays a choice, so the picker shows
    // what the value is rather than another option; the form marks it.
    const held = value === undefined || value === '' ? '' : String(value);
    const shown = held !== '' && !options.some((option) => (typeof option === 'string' ? option : option.value) === held) ? [...options, { value: held, label: held }] : options;
    const withPlaceholder: ChoiceOption[] = required
      ? shown
      : [{ value: '', label: t('form/select', 'Select…') }, ...shown];
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
    return <ArrayControl field={field} value={value} onChange={onChange} namespace={namespace} formatRenderers={formatRenderers} jsonEditor={jsonEditor} views={views} jsonTextFields={jsonTextFields} />;
  }

  if (type === 'object') {
    return (
      <SchemaForm
        schema={objectSchema(field)}
        value={isObjectRecord(value) ? value : {}}
        onChange={(next) => onChange(next)}
        namespace={namespace}
        formatRenderers={formatRenderers} jsonEditor={jsonEditor}
        views={views}
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

// A value as JSON text: a tuple array, or a value of any JSON shape. It holds
// the text it shows, so a draft that does not parse stays on screen with its
// error instead of snapping back.
interface JsonTextProps {
  value: unknown;
  fits: (parsed: unknown) => boolean;
  shape: string;
  onChange: (next: unknown) => void;
  jsonEditor?: JsonEditor;
  /** Grow the text box with its lines, up to five, instead of five always. */
  fitRows?: boolean;
}

function JsonText({ value, fits, shape, onChange, jsonEditor, fitRows }: JsonTextProps) {
  const shown = value === undefined ? '' : JSON.stringify(value, null, 2);
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
    const problem = jsonProblem(next, fits, shape);
    setError(problem.error);
    if (problem.error !== null) return;
    sent.current = JSON.stringify(problem.parsed, null, 2);
    onChange(problem.parsed);
  };
  return (
    <>
      {jsonEditor ? <JsonEditorBox editor={jsonEditor} value={text} onChange={edit} /> : <TextField multiline rows={fitRows ? Math.min(5, text.split('\n').length) : 5} value={text} onChange={edit} />}
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
  views?: SchemaFormView[];
  jsonTextFields?: boolean;
}

function ArrayControl({ field, value, onChange, namespace, formatRenderers, jsonEditor, views, jsonTextFields }: ArrayControlProps) {
  const { t } = useI18n();
  const items = Array.isArray(value) ? value : [];
  const itemSchema = resolveArrayItemSchema(field);

  // Tuple arrays — edited as raw JSON.
  if (!itemSchema) return <JsonText value={items} fits={Array.isArray} shape="an array" onChange={onChange} jsonEditor={jsonEditor} />;

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
              views={views}
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

// ── Map rows ────────────────────────────────────────────────────────────────

interface MapControlProps {
  valueSchema: JsonSchemaField;
  // The whole object: the named keys stay as they are, the rest are rows.
  value: Record<string, unknown>;
  named: string[];
  onChange: (next: Record<string, unknown>) => void;
  namespace?: string;
  formatRenderers?: Record<string, FormatRenderer>;
  jsonEditor?: JsonEditor;
  views?: SchemaFormView[];
  jsonTextFields?: boolean;
}

// The keys of an object that its schema does not name, one row each: a name,
// a value drawn from `additionalProperties`, and remove. A new row starts from
// a name typed below the rows.
function MapControl({ valueSchema, value, named, onChange, namespace, formatRenderers, jsonEditor, views, jsonTextFields }: MapControlProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const entries = Object.keys(value).filter((key) => !named.includes(key));
  const taken = (name: string): boolean => Object.hasOwn(value, name);

  // A rename keeps the row where it was, so the object's order is the screen's.
  function rename(from: string, to: string): void {
    onChange(Object.fromEntries(Object.entries(value).map(([key, held]) => [key === from ? to : key, held])));
  }

  function remove(key: string): void {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  const draftError = draft !== '' && taken(draft) ? t('form/nameTaken', 'That name is taken.') : undefined;
  const add = (): void => {
    if (draft === '' || taken(draft)) return;
    onChange({ ...value, [draft]: defaultValueForSchema(valueSchema) });
    setDraft('');
  };

  return (
    <div className="oo-schema-form__map">
      {entries.map((key, index) => (
        <div className="oo-schema-form__map-entry" key={index}>
          <MapName name={key} taken={(name) => name !== key && taken(name)} onRename={(to) => rename(key, to)} />
          <div className="oo-schema-form__map-value">
            <SchemaControl
              field={valueSchema}
              value={value[key]}
              onChange={(next) => onChange({ ...value, [key]: next })}
              namespace={namespace}
              formatRenderers={formatRenderers}
              jsonEditor={jsonEditor}
              views={views}
              jsonTextFields={jsonTextFields}
            />
          </div>
          <button
            type="button"
            className="oo-schema-form__array-remove"
            onClick={() => remove(key)}
            aria-label={t('form/removeEntry', { fallback: 'Remove {name}', name: key })}
          >
            {NAMED_GLYPH.closePanel}
          </button>
        </div>
      ))}
      <div className="oo-schema-form__map-add">
        <TextField
          value={draft}
          placeholder={t('form/entryName', 'Name')}
          onChange={setDraft}
          error={draftError}
        />
        <button type="button" className="oo-btn oo-schema-form__array-add" disabled={draft === '' || draftError !== undefined} onClick={add}>
          {t('form/addEntry', '+ add')}
        </button>
      </div>
    </div>
  );
}

// A row's name. It holds what is typed, and renames the key only while the
// text is a name no other row has, so a half-typed clash never takes a value.
function MapName({ name, taken, onRename }: { name: string; taken: (name: string) => boolean; onRename: (to: string) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(name);
  // A name that changed from outside, as a reset, replaces the text.
  useEffect(() => {
    setText((current) => (current === '' || taken(current) ? current : name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  const error = text === '' ? t('form/nameEmpty', 'A name is needed.') : taken(text) ? t('form/nameTaken', 'That name is taken.') : undefined;
  return (
    <div className="oo-schema-form__map-name">
      <TextField
        value={text}
        placeholder={t('form/entryName', 'Name')}
        error={error}
        onChange={(next) => {
          setText(next);
          if (next !== '' && !taken(next) && next !== name) onRename(next);
        }}
      />
    </div>
  );
}
