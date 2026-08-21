import type { BindingPath } from '../../sdk/component-graph.js';
import type { ReactiveStore, ScopeName } from '../../sdk/reactive-store.js';

// JSON Pointer-style path resolver (RFC 6901-shaped).
//
// Two top-level shapes:
//   `$/seg/seg`  — absolute (scope = first segment)
//   `/seg/seg`   — relative to the current data context
//
// Reserved sigils inside a path string:
//   `#/...`      — value AT this path is itself a path (one extra hop)
//   `{{ ... }}`  — substitute the inner path's value into the surrounding string
//   `*`          — wildcard segment (subscriptions only)
//   `..`         — forbidden (escape to root with `$/` instead)
//
// RFC 6901 escapes inside a segment: `~1` ↔ `/`, `~0` ↔ `~` (order matters).

export interface ParsedPath {
  absolute: boolean;
  segments: string[];
}

export function parsePath(path: string): ParsedPath {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error(`Invalid path: empty`);
  }
  if (path.startsWith('$/')) {
    return { absolute: true, segments: parseSegments(path.slice(2)) };
  }
  if (path.startsWith('/')) {
    return { absolute: false, segments: parseSegments(path.slice(1)) };
  }
  throw new Error(`Invalid path "${path}": must start with "$/" or "/"`);
}

function parseSegments(rest: string): string[] {
  if (rest === '') return [];
  const segs = rest.split('/');
  const out: string[] = new Array(segs.length);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s === '..') {
      throw new Error(`Invalid path: ".." segment is forbidden — escape to root with "$/"`);
    }
    out[i] = unescapePointer(s);
  }
  return out;
}

function unescapePointer(seg: string): string {
  // Order matters: ~1 → / first, then ~0 → ~ (so `~01` → `~1`, not `/`).
  return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}

function escapePointer(seg: string): string {
  return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function scopeOf(path: BindingPath): ScopeName {
  const parsed = parsePath(path);
  if (!parsed.absolute) {
    throw new Error(`Cannot determine scope of relative path "${path}"`);
  }
  const first = parsed.segments[0];
  if (!first) throw new Error(`Path "${path}" has no scope segment`);
  return first as ScopeName;
}

// Joins a relative path against its data context. Returns the canonical
// absolute path string for store I/O. If `path` is already absolute, returns it.
export function joinAbsolute(
  dataContext: BindingPath | undefined,
  path: BindingPath,
): BindingPath {
  const parsed = parsePath(path);
  if (parsed.absolute) return path;
  if (!dataContext) {
    throw new Error(
      `Relative path "${path}" cannot resolve: no data context active`,
    );
  }
  const ctx = parsePath(dataContext);
  if (!ctx.absolute) {
    throw new Error(`Data context "${dataContext}" must be absolute ($/-form)`);
  }
  return joinSegments([...ctx.segments, ...parsed.segments]);
}

export function joinSegments(segments: string[]): BindingPath {
  if (segments.length === 0) return '$/' as BindingPath;
  return ('$/' + segments.map(escapePointer).join('/')) as BindingPath;
}

// Returns whether `path` contains a wildcard segment.
export function hasWildcard(path: BindingPath): boolean {
  return parsePath(path).segments.includes('*');
}

// Interpolates `{{ inner }}` substrings inside a path string. Each inner path
// is resolved and its value (stringified) replaces the substring. Returns the
// new raw path string (which still needs parsing / joining).
//
// Substitutions resolve through readPath, so the inner can itself be absolute,
// relative, or a `#/` form. Nesting is limited to 1 level for safety.
export function interpolatePath(
  store: ReactiveStore,
  dataContext: BindingPath | undefined,
  raw: string,
  depth = 0,
): string {
  if (depth > 1) throw new Error(`interpolatePath: recursion limit (1 level)`);
  if (!raw.includes('{{')) return raw;
  return raw.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, inner: string) => {
    const v = readPath(store, dataContext, inner as BindingPath, depth + 1);
    return String(v ?? '');
  });
}

// Reads the value at `path`. Handles `$/` absolute, `/` relative, `#/`
// indirection, `{{ ... }}` interpolation, and hierarchical descent into
// stored container values.
//
// The store is flat (`Map<string, unknown>`), but a path like
// `$/scope/list/0/name` may refer to a nested location inside a single
// stored value (an array, then an object). When the full path isn't keyed,
// we walk down: longest stored ancestor prefix → traverse remaining
// segments into its value via property / array-index access.
//
// Throws on `*` wildcard paths (subscribe instead) and on `..` segments.
export function readPath(
  store: ReactiveStore,
  dataContext: BindingPath | undefined,
  path: BindingPath,
  depth = 0,
): unknown {
  if (typeof path !== 'string') {
    throw new Error(`readPath: expected string path`);
  }
  const interpolated = path.includes('{{')
    ? (interpolatePath(store, dataContext, path, depth) as BindingPath)
    : path;
  if (interpolated.startsWith('#/')) {
    const refPath = ('$' + interpolated.slice(1)) as BindingPath;
    const refValue = store.get(refPath);
    if (typeof refValue !== 'string') {
      throw new Error(
        `#/-path reference at "${path}" did not resolve to a path string (got ${typeof refValue})`,
      );
    }
    if (depth > 4) throw new Error(`readPath: indirection limit exceeded`);
    return readPath(store, dataContext, refValue as BindingPath, depth + 1);
  }
  const abs = joinAbsolute(dataContext, interpolated);
  if (hasWildcard(abs)) {
    throw new Error(
      `readPath: wildcard paths are read via subscribe only ("${abs}")`,
    );
  }
  const direct = store.get(abs);
  if (direct !== undefined) return direct;
  return walkInto(store, abs);
}

// Walks down from the longest stored ancestor prefix of `abs`, descending
// into its value via the remaining segments. Returns undefined when no
// prefix is stored or traversal hits a non-container.
function walkInto(store: ReactiveStore, abs: BindingPath): unknown {
  const parsed = parsePath(abs);
  if (!parsed.absolute || parsed.segments.length === 0) return undefined;
  for (let i = parsed.segments.length - 1; i >= 1; i--) {
    const prefix = joinSegments(parsed.segments.slice(0, i));
    const base = store.get(prefix);
    if (base === undefined) continue;
    return descend(base, parsed.segments.slice(i));
  }
  return undefined;
}

function descend(value: unknown, segments: string[]): unknown {
  let cur: unknown = value;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
      continue;
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

// Writes a value through the resolver. Only plain DataBinding paths are
// writable — `#/`-form and wildcard paths throw.
export function writePath(
  store: ReactiveStore,
  dataContext: BindingPath | undefined,
  path: BindingPath,
  value: unknown,
): void {
  if (path.startsWith('#/')) {
    throw new Error(`writePath: #/-form paths are read-only ("${path}")`);
  }
  const interpolated = path.includes('{{')
    ? (interpolatePath(store, dataContext, path) as BindingPath)
    : path;
  const abs = joinAbsolute(dataContext, interpolated);
  if (hasWildcard(abs)) {
    throw new Error(`writePath: wildcard paths are read-only ("${abs}")`);
  }
  store.set(abs, value);
}
