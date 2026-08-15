// Token parsing for chat-style inputs. A token is a contiguous non-whitespace
// run starting with one of the configured prefixes ('/' or '@' by default).
// The "active" token is the one straddling the caret, or none.
//
// Ported from web's chat slash token.ts and generalized to accept any prefix.

export interface TokenInfo {
  token: string;           // the full token text including prefix, e.g. '/agent' or '@grace'
  prefix: string;          // the leading prefix character, e.g. '/' or '@'
  query: string;           // the text after the prefix; '' for a bare '/' or '@'
  start: number;           // index of token start in input
  end: number;             // index of token end (exclusive) in input
}

export function clampCaretIndex(input: string, caretIndex?: number | null): number {
  if (typeof caretIndex !== 'number' || Number.isNaN(caretIndex)) return input.length;
  return Math.max(0, Math.min(input.length, Math.floor(caretIndex)));
}

// Returns the active token straddling the caret, when its prefix matches one
// of `prefixes`. Returns null otherwise. Whitespace-bounded; identical caret
// rules to web (caret inside or immediately after the token both count).
export function getActiveToken(
  input: string,
  prefixes: string[] = ['/', '@'],
  caretIndex?: number | null,
): TokenInfo | null {
  if (!input) return null;
  const caret = clampCaretIndex(input, caretIndex);

  let probe = -1;
  if (caret < input.length && !/\s/.test(input[caret] ?? '')) {
    probe = caret;
  } else if (caret > 0 && !/\s/.test(input[caret - 1] ?? '')) {
    probe = caret - 1;
  } else {
    return null;
  }

  let start = probe;
  while (start > 0 && !/\s/.test(input[start - 1] ?? '')) start -= 1;
  let end = probe + 1;
  while (end < input.length && !/\s/.test(input[end] ?? '')) end += 1;

  const token = input.slice(start, end);
  const prefix = prefixes.find((p) => token.startsWith(p));
  if (!prefix) return null;
  return {
    token,
    prefix,
    query: token.slice(prefix.length),
    start,
    end,
  };
}

// Rewrite the active token with `replacement` while preserving the rest of
// the input. `replacement` may be empty to delete the token. Trailing
// whitespace is collapsed.
export function replaceActiveToken(
  input: string,
  caretIndex: number | null | undefined,
  replacement: string,
  prefixes: string[] = ['/', '@'],
): string {
  const info = getActiveToken(input, prefixes, caretIndex);
  if (!info) return input;
  const before = input.slice(0, info.start);
  const after = input.slice(info.end);
  return `${before}${replacement}${after}`.replace(/[ \t]+$/g, '');
}

// Replace the active token with `replacement` and report the caret position
// after it, so the host can sync caret state + focus. Unlike replaceActiveToken
// this preserves an intentional trailing space in `replacement` (only the
// empty-replacement / deletion case trims), and returns the caret so a mention
// insertion like '@/path ' lands the caret past the space — which dismisses the
// token and closes the picker. No active token → input unchanged, caret clamped.
//   commitToken('msg @foo', 8, '@/a/b ')  → { next: 'msg @/a/b ', caret: 10 }
//   commitToken('say /model', 10, '')     → { next: 'say', caret: 3 }
export function commitToken(
  input: string,
  caretIndex: number | null | undefined,
  replacement: string,
  prefixes: string[] = ['/', '@'],
): { next: string; caret: number } {
  const info = getActiveToken(input, prefixes, caretIndex);
  if (!info) return { next: input, caret: clampCaretIndex(input, caretIndex) };
  const before = input.slice(0, info.start);
  const after = input.slice(info.end);
  let next = `${before}${replacement}${after}`;
  if (replacement === '') next = next.replace(/[ \t]+$/g, '');
  return { next, caret: Math.min(before.length + replacement.length, next.length) };
}

// Write a command's shortcut into the input for a composer-button open:
// replace the active token if the caret is on one, else append a new token
// (with a separating space when needed). Returns the new string and the caret
// position just after the inserted shortcut — the host syncs its caret to this
// so token detection lands on the freshly-written token.
//   insertShortcut('', 0, '/mode')        → { next: '/mode', caret: 5 }
//   insertShortcut('/mod', 4, '/model')   → { next: '/model', caret: 6 }
//   insertShortcut('hi', 2, '/mode')      → { next: 'hi /mode', caret: 8 }
export function insertShortcut(
  input: string,
  caretIndex: number | null | undefined,
  shortcut: string,
  prefixes: string[] = ['/', '@'],
): { next: string; caret: number } {
  const info = getActiveToken(input, prefixes, caretIndex);
  if (info) {
    const next = `${input.slice(0, info.start)}${shortcut}${input.slice(info.end)}`;
    return { next, caret: info.start + shortcut.length };
  }
  const sep = input.length > 0 && !/\s$/.test(input) ? ' ' : '';
  const next = `${input}${sep}${shortcut}`;
  return { next, caret: next.length };
}

// Match a typed token against a command's `shortcut`. shortcut may be a
// string ('/agent') or array (['/agent', '/persona']). Returns true if the
// typed token starts with any registered shortcut — keeps the menu open while
// the user types more after the sentinel.
export function shortcutMatchesToken(
  shortcut: string | string[] | undefined,
  token: string,
): boolean {
  if (!shortcut) return false;
  const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut];
  const lower = token.toLowerCase();
  return shortcuts.some((s) => lower.startsWith(s.toLowerCase()));
}

// Strip a submenu's sentinel (and a following '=' or whitespace) off the raw
// token query, leaving the inline-filter text. The sentinel is in shortcut
// form ('/model'); the raw query excludes the prefix ('model=gemi') so the
// prefix is dropped before matching. With an array, the first matching
// sentinel wins. Returns the raw query unchanged when no sentinel is given or
// none matches.
//   stripSentinel('model=gemi', '/model')          === 'gemi'
//   stripSentinel('model', '/model')               === ''
//   stripSentinel('rout', '/model')                === 'rout'
//   stripSentinel('persona x', ['/agent','/persona']) === 'x'
export function stripSentinel(rawQuery: string, sentinel: string | string[] | undefined): string {
  if (!sentinel) return rawQuery;
  const sentinels = Array.isArray(sentinel) ? sentinel : [sentinel];
  const lower = rawQuery.toLowerCase();
  for (const s of sentinels) {
    const bare = s.replace(/^[/@]/, '');
    if (lower.startsWith(bare.toLowerCase())) {
      return rawQuery.slice(bare.length).replace(/^[=\s]+/, '');
    }
  }
  return rawQuery;
}

// True when the token still starts with any of the frame's sentinels — the
// picker keeps a pushed submenu open while this holds, and collapses to the
// root command list once it doesn't.
export function tokenMatchesSentinel(token: string, sentinel: string | string[] | undefined): boolean {
  if (!sentinel) return true;
  const sentinels = Array.isArray(sentinel) ? sentinel : [sentinel];
  const lower = token.toLowerCase();
  return sentinels.some((s) => lower.startsWith(s.toLowerCase()));
}

// Returns the canonical shortcut for a command — first entry when array,
// the string itself when single, undefined when unset. Used by composer
// buttons to rewrite the input to match the slash-typed form.
export function canonicalShortcut(
  shortcut: string | string[] | undefined,
): string | undefined {
  if (!shortcut) return undefined;
  return Array.isArray(shortcut) ? shortcut[0] : shortcut;
}
