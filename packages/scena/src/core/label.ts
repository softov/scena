// A resolvable label: a plain string, a store binding (`{ path }`), or an i18n
// key (`{ t }`). Used for header/action labels that may come from a literal,
// reactive store value, or a translation.
import type { Label, LabelResolveContext } from "../types/label.js";

// the useLabel hook (reactive).
export function resolveLabel(label: Label | undefined, ctx: LabelResolveContext): string {
  if (label == null) return '';
  if (typeof label === 'string') return label;
  if ('t' in label) return ctx.translate(label.t);
  if ('path' in label) {
    const v = ctx.get(label.path);
    return v == null ? '' : String(v);
  }
  return '';
}
