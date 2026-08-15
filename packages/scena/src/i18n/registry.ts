// i18n message registry — the source of truth for translations + the active
// locale. A module singleton so synchronous `translate()` works ANYWHERE
// (React, plain TS error throws, provider field labels) without a store ref.
//
// Messages are stored as a TREE per locale (nested objects — exactly the shape
// of an `en.json`), NOT a flat map: `registerMessages` deep-merges subtrees,
// keys address into the tree, and a whole namespace/subtree can be dropped.
// Keys accept `/` or `.` separators (`setup/title` == `setup.title`).
//
// The `$/t` ScopeBackend (i18n-backend.ts) projects this into the reactive
// store so declarative ComponentNodes can bind `{ path: '$/t/setup/title' }`;
// the useT hook reads it reactively for hand-written React.

export type MessageTree = { [segment: string]: string | MessageTree };

// Metadata for one locale — drives language pickers (LocaleToggle) and dir.
export interface LocaleInfo {
  locale: string;            // 'pt-BR' (or 'pt')
  language?: string;         // 'pt'
  country?: string;          // 'BR'
  emoji?: string;            // '🇧🇷'
  name?: string;             // 'Português (Brasil)'
  dir?: 'ltr' | 'rtl';
}

// 3rd arg to registerMessages — `namespace` prefixes keys; the rest is locale
// metadata merged into the registry's LocaleInfo for that locale.
export interface RegisterMessagesExtra extends Omit<LocaleInfo, 'locale'> {
  namespace?: string;
}

const locales = new Map<string, MessageTree>();
const localeInfo = new Map<string, LocaleInfo>();
const listeners = new Set<() => void>();
let currentLocale = 'en';
let fallbackLocale = 'en';

function notify(): void {
  for (const l of [...listeners]) l();
}

function splitKey(key: string): string[] {
  return key.split(/[./]/).filter(Boolean);
}

function setAt(tree: MessageTree, segs: string[], value: string): void {
  let node = tree;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i]!;
    const next = node[s];
    if (typeof next !== 'object' || next === null) node[s] = {};
    node = node[s] as MessageTree;
  }
  node[segs[segs.length - 1]!] = value;
}

function resolveAt(tree: MessageTree | undefined, segs: string[]): string | MessageTree | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const s of segs) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[s];
  }
  return node;
}

// Deep-merge a (possibly nested, possibly dotted-key) message object into the
// locale tree, under an optional namespace prefix.
function merge(tree: MessageTree, src: Record<string, unknown>, prefix: string[]): void {
  for (const [k, v] of Object.entries(src)) {
    const segs = [...prefix, ...splitKey(k)];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      merge(tree, v as Record<string, unknown>, segs);
    } else {
      setAt(tree, segs, String(v));
    }
  }
}

// `\{` / `\}` render literal braces; `{token}` interpolates from params (left
// untouched when no params are supplied, so a template can survive round-trips).
function interpolate(tpl: string, params?: Record<string, unknown>): string {
  return tpl.replace(
    /\\([{}])|\{(\w+)\}/g,
    (match, esc: string | undefined, token: string | undefined) => {
      if (esc) return esc;
      if (!params) return match;
      const v = params[token!];
      return v == null ? '' : String(v);
    },
  );
}

function collectLeaves(node: MessageTree, prefix: string[], out: Set<string>): void {
  for (const [seg, v] of Object.entries(node)) {
    if (typeof v === 'object' && v !== null) collectLeaves(v, [...prefix, seg], out);
    else out.add([...prefix, seg].join('/'));
  }
}

function deriveLocaleParts(locale: string): { language?: string; country?: string } {
  const [language, country] = locale.split('-');
  return country ? { language, country } : { language };
}

// Register a locale's metadata (emoji/name/dir) for pickers — independent of
// messages, so an inline-fallback locale (e.g. 'en') still appears in a toggle.
export function registerLocale(info: LocaleInfo): void {
  const prev = localeInfo.get(info.locale);
  localeInfo.set(info.locale, { ...deriveLocaleParts(info.locale), ...prev, ...info });
  notify();
}

// Merge a dictionary into a locale's tree. `messages` may be nested or use
// dotted/slashed keys. `extra.namespace` prefixes every key; the remaining
// `extra` fields (emoji/name/country/language/dir) are merged into the locale's
// metadata. Plugins call this on load; the $/t backend + useI18n refresh.
export function registerMessages(
  locale: string,
  messages: Record<string, unknown>,
  extra?: RegisterMessagesExtra,
): void {
  const tree = locales.get(locale) ?? {};
  merge(tree, messages, extra?.namespace ? splitKey(extra.namespace) : []);
  locales.set(locale, tree);
  if (extra) {
    const meta: Record<string, unknown> = { ...extra };
    delete meta.namespace;
    if (Object.keys(meta).length) {
      const prev = localeInfo.get(locale);
      localeInfo.set(locale, {
        ...deriveLocaleParts(locale),
        ...prev,
        ...(meta as Partial<LocaleInfo>),
        locale,
      });
    }
  }
  notify();
}

// Drop a subtree (namespace) from a locale, or the whole locale when no
// namespace is given. The tree shape makes this O(subtree).
export function unregisterMessages(locale: string, namespace?: string): void {
  if (!namespace) {
    locales.delete(locale);
    notify();
    return;
  }
  const segs = splitKey(namespace);
  const parent = resolveAt(locales.get(locale), segs.slice(0, -1));
  if (parent && typeof parent === 'object') delete parent[segs[segs.length - 1]!];
  notify();
}

export function setLocale(locale: string): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  notify();
}

export function getLocale(): string {
  return currentLocale;
}

export function setFallbackLocale(locale: string): void {
  fallbackLocale = locale;
}

export function listLocales(): string[] {
  return [...locales.keys()];
}

// All known locales (those with registered messages and/or metadata), for
// language pickers. Locales known only by messages get a derived default.
export function listLocaleInfo(): LocaleInfo[] {
  const out = new Map<string, LocaleInfo>();
  for (const loc of locales.keys()) out.set(loc, { locale: loc, ...deriveLocaleParts(loc) });
  for (const [loc, info] of localeInfo) out.set(loc, info);
  return [...out.values()];
}

// Metadata for one locale (defaults to the active locale). undefined when the
// locale is entirely unknown.
export function getLocaleInfo(locale: string = currentLocale): LocaleInfo | undefined {
  return (
    localeInfo.get(locale) ??
    (locales.has(locale) ? { locale, ...deriveLocaleParts(locale) } : undefined)
  );
}

// Resolve a key to its tree node (leaf string OR subtree object) for the active
// locale, falling back to fallbackLocale. Used by the $/t backend so a binding
// can target a leaf or a whole subtree.
export function resolveMessage(
  key: string,
  locale: string = currentLocale,
): string | MessageTree | undefined {
  const segs = splitKey(key);
  return resolveAt(locales.get(locale), segs) ?? resolveAt(locales.get(fallbackLocale), segs);
}

// Leaf string for a key (undefined when missing or pointing at a subtree).
export function lookup(key: string, locale: string = currentLocale): string | undefined {
  const v = resolveMessage(key, locale);
  return typeof v === 'string' ? v : undefined;
}

// `fallback` is reserved (inline default when the key is unregistered); every
// OTHER key is an interpolation param. Interpolation runs on the resolved
// message or the fallback — NOT the key.
export type TranslateOptions = { fallback?: string } & Record<string, unknown>;

// Translate + interpolate. The key is ALWAYS a lookup key (never a template).
// 2nd arg: a string (shorthand for `{ fallback }`) OR the flat options object:
//   translate('setup.title', 'Set up doop')                       // shorthand
//   translate('signedInAs', { name, fallback: 'Signed in as {name}' })
//   translate('wall.title')                                       // no opts
// Active locale → fallbackLocale → fallback. A missing key with no fallback
// yields the `{key}` marker so gaps stay visible.
export function translate(key: string, fallbackOrOptions?: string | TranslateOptions): string {
  const opts: TranslateOptions | undefined =
    typeof fallbackOrOptions === 'string' ? { fallback: fallbackOrOptions } : fallbackOrOptions;
  const tpl = lookup(key) ?? opts?.fallback;
  if (tpl === undefined) return `{${splitKey(key).join('/')}}`;
  return interpolate(tpl, opts);
}

export function allKeys(): string[] {
  const set = new Set<string>();
  for (const tree of locales.values()) collectLeaves(tree, [], set);
  return [...set];
}

export function subscribeI18n(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

// Test helper — clears all messages + resets locale.
export function clearMessages(): void {
  locales.clear();
  localeInfo.clear();
  currentLocale = 'en';
  fallbackLocale = 'en';
  notify();
}
