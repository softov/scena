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
  /** Conditional subschemas: `then` holds where the value matches `if`, else `else`. */
  if?: JsonSchemaField;
  then?: JsonSchemaField;
  else?: JsonSchemaField;
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
  /** What an object's keys must match; an `enum` here names the only keys it allows. */
  propertyNames?: JsonSchemaField;
  /** Show this field only when a sibling field equals a value. */
  'x-show-if'?: { field: string; value: unknown };
  /** OAuth connect metadata — routed to a format renderer by the consumer. */
  'x-oauth-slug'?: string;
  'x-oauth-flow'?: 'pkce' | 'device';
  /** Render this object field as a section header (FormSection). */
  'x-header'?: boolean;
}

export interface JsonSchemaObject
  extends Pick<JsonSchemaField, 'allOf' | 'if' | 'then' | 'else' | 'propertyNames' | 'additionalProperties'> {
  type?: string;
  properties?: Record<string, JsonSchemaField>;
  required?: string[];
  description?: string;
}

// A nested object field as the schema of the form that draws it, keeping what
// narrows it: its conditions and the keys it allows.
export function objectSchema(field: JsonSchemaField): JsonSchemaObject {
  const schema: JsonSchemaObject = { type: 'object', properties: field.properties ?? {}, required: field.required ?? [] };
  if (field.allOf !== undefined) schema.allOf = field.allOf;
  if (field.if !== undefined) schema.if = field.if;
  if (field.then !== undefined) schema.then = field.then;
  if (field.else !== undefined) schema.else = field.else;
  if (field.propertyNames !== undefined) schema.propertyNames = field.propertyNames;
  if (field.additionalProperties !== undefined) schema.additionalProperties = field.additionalProperties;
  return schema;
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

// Whether a value matches a schema, as far as an `if` needs to pick its branch:
// `const`, `enum`, `required`, `properties` and `allOf`. Any other keyword
// passes, as it would in a validator that does not know it. As in JSON Schema,
// `required` and `properties` hold for a value that is not an object.
export function matchesSchema(schema: JsonSchemaField, value: unknown): boolean {
  if (schema.const !== undefined && !deepEqual(schema.const, value)) return false;
  if (schema.enum !== undefined && !schema.enum.some((one) => deepEqual(one, value))) return false;
  if (isObjectRecord(value)) {
    if (schema.required?.some((key) => !Object.hasOwn(value, key))) return false;
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key) && !matchesSchema(sub, value[key])) return false;
    }
  }
  return (schema.allOf ?? []).every((one) => matchesSchema(one, value));
}

// The keys an object schema allows: its `propertyNames` enum, else its own
// `properties` when it takes no others; undefined when any key will do.
export function allowedKeys(schema: JsonSchemaField): string[] | undefined {
  if (schema.propertyNames?.enum !== undefined) return schema.propertyNames.enum;
  if (schema.additionalProperties === false) return Object.keys(schema.properties ?? {});
  return undefined;
}

// Two schemas that must both hold, as one. Where both name a keyword they join:
// enums intersect, required and properties combine, the keys an object allows
// are those both allow, bounds take the tighter. Elsewhere `a` wins. A
// condition in `b` is kept under `allOf`, for the form of the object it sits on.
function mergeSchemas(a: JsonSchemaField, b: JsonSchemaField): JsonSchemaField {
  const { if: test, then, else: otherwise, ...plain } = b;
  const merged: JsonSchemaField = { ...plain, ...a };
  if (a.enum !== undefined && b.enum !== undefined) merged.enum = a.enum.filter((one) => b.enum!.includes(one));
  if (a.required !== undefined && b.required !== undefined) merged.required = [...new Set([...a.required, ...b.required])];
  if (a.properties !== undefined && b.properties !== undefined) {
    const keys = [...new Set([...Object.keys(a.properties), ...Object.keys(b.properties)])];
    merged.properties = Object.fromEntries(keys.map((key) => {
      const left = a.properties![key];
      const right = b.properties![key];
      return [key, left !== undefined && right !== undefined ? mergeSchemas(left, right) : (left ?? right)!];
    }));
  }
  if (isObjectRecord(a.items) && isObjectRecord(b.items)) {
    merged.items = mergeSchemas(a.items as JsonSchemaField, b.items as JsonSchemaField);
  }
  if (a.minimum !== undefined && b.minimum !== undefined) merged.minimum = Math.max(a.minimum, b.minimum);
  if (a.maximum !== undefined && b.maximum !== undefined) merged.maximum = Math.min(a.maximum, b.maximum);
  const left = allowedKeys(a);
  const right = allowedKeys(b);
  if (left !== undefined || right !== undefined) {
    merged.propertyNames = { enum: left === undefined ? right! : right === undefined ? left : left.filter((key) => right.includes(key)) };
  }
  const condition: JsonSchemaField = {};
  if (test !== undefined) condition.if = test;
  if (then !== undefined) condition.then = then;
  if (otherwise !== undefined) condition.else = otherwise;
  const conditions = [...(a.allOf ?? []), ...(b.allOf ?? []), ...(test === undefined ? [] : [condition])];
  if (conditions.length > 0) merged.allOf = conditions;
  else delete merged.allOf;
  return merged;
}

// The schema as it holds for a value: each `allOf` entry, and the `then` or
// `else` its `if` picks, folded into one, so a branch's narrowing (fewer
// choices, fewer keys, more required) shows in the form. Applied to one object
// at a time; a nested object's conditions are its own form's to resolve.
export function resolveConditionals<T extends JsonSchemaField>(schema: T, value: unknown): T {
  const { allOf, if: test, then, else: otherwise, ...rest } = schema;
  const branches: JsonSchemaField[] = [...(allOf ?? [])];
  if (test !== undefined) {
    const branch = matchesSchema(test, value) ? then : otherwise;
    if (branch !== undefined) branches.push(branch);
  }
  return branches.reduce<JsonSchemaField>((merged, branch) => mergeSchemas(merged, resolveConditionals(branch, value)), rest) as T;
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
