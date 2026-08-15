import type { BindingPath } from '../../types/component-graph.js';
import type { Disposable } from '../../types/disposable.js';
import type { ScopeBackend } from '../../types/scope-backend.js';

// A ScopeBackend that publishes the display environment as `$/modus/<key>`, so
// `when` clauses can gate surfaces on it without any new concept:
//
//   { surface: 'sidebar:right', when: '$/modus/class != "xsmall"' }
//
// Read-only, like the i18n backend: values are derived from the environment,
// never written through the store. Nothing is copied into the store tree —
// values resolve on read from a snapshot that is recomputed only when the
// environment actually changes.
//
// This deliberately lives in the runtime rather than in CSS. Shell structure
// (which surfaces mount at all) is a runtime decision; component reflow inside
// a surface stays CSS, and should use container queries rather than these
// values — a Row inside a drawer is narrow even on a wide viewport.

// A pure size ladder, matching the vocabulary already in styles/index.ts
// (SIZE_NAMES = xs / sm / md / lg). Named for size and never for device: a
// narrow desktop window is `small`, and `coarse` — not width — is what
// identifies a phone.
export type ModusClass = 'xsmall' | 'small' | 'medium' | 'large';

export interface ModusBreakpoints {
  // Lower bound, in px, for each class above `xsmall`.
  small: number;
  medium: number;
  large: number;
}

export const DEFAULT_MODUS_BREAKPOINTS: ModusBreakpoints = {
  small: 640,
  medium: 1024,
  large: 1440,
};

export interface ModusBackendOptions {
  scope?: string;
  breakpoints?: Partial<ModusBreakpoints>;
}

interface Snapshot {
  class: ModusClass;
  width: number;
  height: number;
  // `class` narrowed to the two booleans that when-clauses actually want, so
  // callers write `$/modus/compact` instead of comparing against two strings.
  // `compact` spans xsmall+small; `large` is the single top class, kept as a
  // boolean so both convenience reads share one spelling.
  compact: boolean;
  large: boolean;
  portrait: boolean;
  // Pointer accuracy. Width alone cannot tell a touch laptop from a phone, and
  // hit targets should follow the pointer, not the width.
  coarse: boolean;
}

const KEYS = [
  'class',
  'width',
  'height',
  'compact',
  'large',
  'portrait',
  'coarse',
] as const;

type Key = (typeof KEYS)[number];

function classify(width: number, bp: ModusBreakpoints): ModusClass {
  if (width >= bp.large) return 'large';
  if (width >= bp.medium) return 'medium';
  if (width >= bp.small) return 'small';
  return 'xsmall';
}

// Used when there is no DOM (SSR, node test runners). A fixed desktop-ish
// reading is the honest default: it renders the full shell, which degrades
// visibly rather than silently hiding surfaces on a server render.
function staticSnapshot(bp: ModusBreakpoints): Snapshot {
  const width = bp.medium;
  return {
    class: classify(width, bp),
    width,
    height: 768,
    compact: false,
    large: false,
    portrait: false,
    coarse: false,
  };
}

function readSnapshot(bp: ModusBreakpoints): Snapshot {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cls = classify(width, bp);
  return {
    class: cls,
    width,
    height,
    compact: cls === 'xsmall' || cls === 'small',
    large: cls === 'large',
    portrait: height > width,
    coarse: window.matchMedia('(pointer: coarse)').matches,
  };
}

export function createModusBackend(opts: ModusBackendOptions = {}): ScopeBackend {
  const scope = opts.scope ?? 'modus';
  const bp: ModusBreakpoints = { ...DEFAULT_MODUS_BREAKPOINTS, ...opts.breakpoints };

  const hasDom =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  let snapshot = hasDom ? readSnapshot(bp) : staticSnapshot(bp);

  // Only keys that have actually been read are re-emitted, so a shell that
  // binds `class` alone stays quiet through a resize that changes `width`
  // every frame.
  const accessed = new Set<Key>();

  return {
    get(segments) {
      if (segments.length !== 1) return { hasValue: false, value: undefined };
      const key = segments[0] as Key;
      if (!(KEYS as readonly string[]).includes(key)) {
        return { hasValue: false, value: undefined };
      }
      accessed.add(key);
      return { hasValue: true, value: snapshot[key] };
    },

    set() {
      /* derived from the environment; not writable through the store */
    },
    delete() {},
    clear() {},

    attach(emit): Disposable {
      if (!hasDom) return { dispose: () => {} };

      let frame: number | null = null;

      function recompute(): void {
        const next = readSnapshot(bp);
        const prev = snapshot;
        snapshot = next;
        for (const key of accessed) {
          if (prev[key] !== next[key]) {
            emit(`$/${scope}/${key}` as BindingPath, next[key]);
          }
        }
      }

      // resize fires per frame during a drag; coalesce so subscribers see at
      // most one notification per frame, and none at all when nothing changed.
      function onResize(): void {
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          recompute();
        });
      }

      const pointer = window.matchMedia('(pointer: coarse)');

      window.addEventListener('resize', onResize);
      pointer.addEventListener('change', recompute);

      return {
        dispose() {
          if (frame !== null) cancelAnimationFrame(frame);
          window.removeEventListener('resize', onResize);
          pointer.removeEventListener('change', recompute);
        },
      };
    },
  };
}
