import type { ArgsSchema, ArgType } from './command.js';

export type ValidateArgsResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: string[] };

export function validateArgs(
  schema: ArgsSchema | undefined,
  input: unknown,
): ValidateArgsResult {
  if (!schema) {
    return {
      ok: true,
      value: (input as Record<string, unknown> | undefined) ?? {},
    };
  }
  const obj = ((input as Record<string, unknown> | undefined) ?? {});
  const value: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, type] of Object.entries(schema)) {
    const v = obj[key];
    if (Array.isArray(type)) {
      if (v === undefined) {
        errors.push(`${key}: required (enum: ${type.join(' | ')})`);
        continue;
      }
      if (typeof v !== 'string' || !type.includes(v)) {
        errors.push(`${key}: expected one of ${type.join(' | ')}`);
        continue;
      }
      value[key] = v;
      continue;
    }
    const typeStr = type as string;
    const optional = typeStr.endsWith('?');
    const base = (optional ? typeStr.slice(0, -1) : typeStr) as 'string' | 'number' | 'boolean';
    if (v === undefined || v === null) {
      if (!optional) errors.push(`${key}: required (${base})`);
      continue;
    }
    if (typeof v !== base) {
      errors.push(`${key}: expected ${base}, got ${typeof v}`);
      continue;
    }
    value[key] = v;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

// `$/scope/seg/seg`-style absolute path. Trailing `/*` allowed for prefix
// permissions; segments may contain alphanumerics, `_`, `-`, `.`, `:`.
export function isPermissionPath(path: string): boolean {
  return /^\$\/[A-Za-z][\w:.-]*(\/[\w:.*-]+)*$/.test(path);
}

export type { ArgsSchema, ArgType };
