// Pure JSON Schema helpers for SchemaForm. No React. Ported from web's
// JsonSchemaForm so the schema logic is testable in isolation and the form
// component stays a thin renderer.

export interface EnumOption {
  value: string;
  label: string;
  description?: string;
}

// The subset of JSON Schema (Draft 2020-12) SchemaForm understands, plus the
// `x-*` authoring extensions web already relies on.
export interface JsonSchemaField {
  type?: string | string[];
  title?: string;
  anyOf?: JsonSchemaField[];
  oneOf?: JsonSchemaField[];
  allOf?: JsonSchemaField[];
  const?: unknown;
  description?: string;
  enum?: string[];
  /** Rich enum options: label + optional description per option. */
  'x-enumOptions'?: EnumOption[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
  format?: string;
  items?: JsonSchemaField | JsonSchemaField[];
  properties?: Record<string, JsonSchemaField>;
  required?: string[];
  additionalProperties?: boolean;
  /** Show this field only when a sibling field equals a value. */
  'x-show-if'?: { field: string; value: unknown };
  /** OAuth connect metadata — routed to a format renderer by the consumer. */
  'x-oauth-slug'?: string;
  'x-oauth-flow'?: 'pkce' | 'device';
  /** Render this object field as a section header (FormSection). */
  'x-header'?: boolean;
}

export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, JsonSchemaField>;
  required?: string[];
  description?: string;
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// Structural equality for form values (JSON-shaped: primitives, arrays,
// plain objects). Used for dirty tracking against a pristine baseline.
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as Record<string, unknown>);
    const bk = Object.keys(b as Record<string, unknown>);
    if (ak.length !== bk.length) return false;
    return ak.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(b, k) &&
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    );
  }
  return false;
}

// Primary type, ignoring "null" in union arrays like ["string", "null"].
export function effectiveType(field: JsonSchemaField): string {
  const t = field.type;
  if (Array.isArray(t)) {
    return (t.find((x) => x !== 'null') ?? 'string') as string;
  }
  if (!t && Array.isArray(field.oneOf)) {
    const fromOneOf = field.oneOf.find((entry) => entry.type && entry.type !== 'null')?.type as
      | string
      | undefined;
    if (fromOneOf) return fromOneOf;
  }
  if (!t && Array.isArray(field.anyOf)) {
    const fromAnyOf = field.anyOf.find((entry) => entry.type && entry.type !== 'null')?.type as
      | string
      | undefined;
    if (fromAnyOf) return fromAnyOf;
  }
  if (!t && field.items) return 'array';
  if (!t && field.properties) return 'object';
  return (t as string | undefined) ?? 'string';
}

export function resolveUnionOptions(field: JsonSchemaField): JsonSchemaField[] {
  if (Array.isArray(field.oneOf) && field.oneOf.length > 0) return field.oneOf;
  if (Array.isArray(field.anyOf) && field.anyOf.length > 0) return field.anyOf;
  return [];
}

export function normalizeUnionOptions(field: JsonSchemaField): JsonSchemaField[] {
  return resolveUnionOptions(field).map((option) => ({
    ...option,
    description: option.description ?? field.description,
  }));
}

// null → tuple arrays (edited as raw JSON); object → item schema.
export function resolveArrayItemSchema(field: JsonSchemaField): JsonSchemaField | null {
  if (!field.items) return { type: 'string' };
  if (Array.isArray(field.items)) return null;
  return field.items;
}

export function defaultValueForSchema(field: JsonSchemaField): unknown {
  const unionOptions = resolveUnionOptions(field);
  if (unionOptions.length > 0) {
    return defaultValueForSchema(unionOptions[0]!);
  }
  if (field.default !== undefined) return field.default;
  if (field.const !== undefined) return field.const;
  const type = effectiveType(field);
  if (type === 'boolean') return false;
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'array') return [];
  if (type === 'object') {
    const defaults: Record<string, unknown> = {};
    const properties = field.properties ?? {};
    const requiredSet = new Set(field.required ?? []);
    for (const [key, child] of Object.entries(properties)) {
      if (child.default !== undefined || child.const !== undefined || requiredSet.has(key)) {
        defaults[key] = defaultValueForSchema(child);
      }
    }
    return defaults;
  }
  return '';
}

// Strip the `[textarea]` / `[textarea:n]` marker web embeds in descriptions.
export function cleanDescription(description?: string): string | undefined {
  if (typeof description !== 'string') return description;
  return description.replace(/\s*\[textarea(?::\d+)?\]/, '');
}

// Returns the textarea row count when a string field is marked as multiline
// (via `format: 'textarea'` or a `[textarea:n]` description marker), else null.
export function textareaRows(field: JsonSchemaField): number | null {
  if (field.format === 'textarea') return 4;
  const match = field.description?.match(/\[textarea(?::(\d+))?\]/);
  if (!match) return null;
  return match[1] ? parseInt(match[1], 10) : 4;
}
