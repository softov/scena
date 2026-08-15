// A resolvable label: a plain string, a store binding (`{ path }`), or an i18n
// key (`{ t }`). Used for header/action labels that may come from a literal,
// reactive store value, or a translation. Resolve via resolveLabel (pure) or
// the useLabel hook (reactive).
export type Label = string | { path: string } | { t: string };

export interface LabelResolveContext {
  get: (path: string) => unknown;
  translate: (key: string) => string;
}
