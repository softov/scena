import { describe, it, expect } from 'vitest';
import {
  getActiveToken,
  replaceActiveToken,
  insertShortcut,
  commitToken,
  shortcutMatchesToken,
  canonicalShortcut,
  stripSentinel,
  tokenMatchesSentinel,
} from '../../src/ui/menu/token.js';

describe('getActiveToken', () => {
  it('finds a slash token straddling the caret', () => {
    const info = getActiveToken('hi /model', ['/', '@'], 9);
    expect(info).toMatchObject({ token: '/model', prefix: '/', query: 'model' });
  });

  it('bare prefix has empty query', () => {
    expect(getActiveToken('/', ['/'], 1)).toMatchObject({ prefix: '/', query: '' });
  });

  it('returns null when caret is on whitespace', () => {
    expect(getActiveToken('/model ', ['/'], 7)).toBeNull();
  });

  it('keeps the post-sentinel text in the query as the user types', () => {
    expect(getActiveToken('/model=gemi', ['/'], 11)?.query).toBe('model=gemi');
  });
});

describe('replaceActiveToken', () => {
  it('rewrites the active token, collapsing trailing space', () => {
    expect(replaceActiveToken('say /mod', null, '/model', ['/'])).toBe('say /model');
  });
  it('deletes the token when replacement is empty', () => {
    expect(replaceActiveToken('say /model', null, '', ['/'])).toBe('say');
  });
});

describe('insertShortcut (composer-button open)', () => {
  it('appends a token + separating space on a non-empty input with no active token', () => {
    expect(insertShortcut('hi', 2, '/mode')).toEqual({ next: 'hi /mode', caret: 8 });
  });
  it('writes the token at the start of an empty input', () => {
    expect(insertShortcut('', 0, '/mode')).toEqual({ next: '/mode', caret: 5 });
  });
  it('replaces the active token in place (autocomplete via button)', () => {
    expect(insertShortcut('/mod', 4, '/model')).toEqual({ next: '/model', caret: 6 });
  });
  it('does not double a trailing space', () => {
    expect(insertShortcut('hi ', 3, '/mode')).toEqual({ next: 'hi /mode', caret: 8 });
  });
});

describe('commitToken (mention/autocomplete insert + caret)', () => {
  it('inserts a mention reference and lands the caret past the trailing space', () => {
    // caret after the space → getActiveToken returns null → picker dismisses
    expect(commitToken('msg @foo', 8, '@/a/b ')).toEqual({ next: 'msg @/a/b ', caret: 10 });
  });
  it('preserves a trailing space when text follows the token', () => {
    expect(commitToken('a @x b', 4, '@y ')).toEqual({ next: 'a @y  b', caret: 5 });
  });
  it('trims and reports caret for the empty (deletion) case', () => {
    expect(commitToken('say /model', 10, '')).toEqual({ next: 'say', caret: 3 });
  });
  it('no active token → input unchanged, caret clamped', () => {
    expect(commitToken('hello', 5, '@x ')).toEqual({ next: 'hello', caret: 5 });
  });
});

describe('shortcutMatchesToken', () => {
  it('matches a typed token that extends a registered shortcut', () => {
    expect(shortcutMatchesToken(['/agent', '/persona'], '/personax')).toBe(true);
    expect(shortcutMatchesToken('/model', '/rout')).toBe(false);
  });
});

describe('canonicalShortcut', () => {
  it('returns the first of an array, the string itself, else undefined', () => {
    expect(canonicalShortcut(['/agent', '/persona'])).toBe('/agent');
    expect(canonicalShortcut('/model')).toBe('/model');
    expect(canonicalShortcut(undefined)).toBeUndefined();
  });
});

describe('stripSentinel', () => {
  it('drops the sentinel and a following = to leave the filter text', () => {
    expect(stripSentinel('model=gemi', '/model')).toBe('gemi');
  });
  it('drops the sentinel and following whitespace', () => {
    expect(stripSentinel('model gpt', '/model')).toBe('gpt');
  });
  it('is empty right after the sentinel', () => {
    expect(stripSentinel('model', '/model')).toBe('');
  });
  it('returns the query unchanged when it no longer matches the sentinel', () => {
    expect(stripSentinel('rout', '/model')).toBe('rout');
  });
  it('returns the raw query when there is no sentinel', () => {
    expect(stripSentinel('anything', undefined)).toBe('anything');
  });
  it('uses the first matching sentinel from an array (aliases)', () => {
    expect(stripSentinel('persona x', ['/agent', '/persona'])).toBe('x');
    expect(stripSentinel('agent', ['/agent', '/persona'])).toBe('');
  });
});

describe('tokenMatchesSentinel', () => {
  it('is true with no sentinel (frame never auto-collapses)', () => {
    expect(tokenMatchesSentinel('/anything', undefined)).toBe(true);
  });
  it('matches any alias in the array', () => {
    expect(tokenMatchesSentinel('/persona', ['/agent', '/persona'])).toBe(true);
    expect(tokenMatchesSentinel('/rout', ['/route', '/routing'])).toBe(false);
  });
  it('stays matched while the user types past the sentinel', () => {
    expect(tokenMatchesSentinel('/model=gemi', '/model')).toBe(true);
  });
});
