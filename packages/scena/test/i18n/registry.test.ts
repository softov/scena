import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerMessages,
  registerLocale,
  translate,
  setLocale,
  getLocale,
  getLocaleInfo,
  listLocaleInfo,
  lookup,
  allKeys,
  listLocales,
  clearMessages,
} from '../../src/i18n/registry.js';

beforeEach(() => clearMessages());

describe('i18n registry', () => {
  it('registers nested + flat messages, flattening to slash keys', () => {
    registerMessages('en', { setup: { title: 'Set up' }, 'auth.invalid': 'Bad creds' });
    expect(lookup('setup/title')).toBe('Set up');
    expect(lookup('auth/invalid')).toBe('Bad creds');
    expect(translate('setup.title')).toBe('Set up'); // dot normalized to slash
  });

  it('namespace (via extra) prefixes keys', () => {
    registerMessages('en', { title: 'X' }, { namespace: 'setup' });
    expect(lookup('setup/title')).toBe('X');
  });

  it('registers locale metadata (registerLocale + extra) for pickers', () => {
    registerLocale({ locale: 'en', emoji: '🇺🇸', name: 'English' });
    registerMessages('pt-BR', { a: 'á' }, { emoji: '🇧🇷', name: 'Português (Brasil)' });

    const info = listLocaleInfo();
    const en = info.find((i) => i.locale === 'en');
    const pt = info.find((i) => i.locale === 'pt-BR');
    expect(en).toMatchObject({ locale: 'en', emoji: '🇺🇸', name: 'English', language: 'en' });
    // pt-BR splits into language/country automatically
    expect(pt).toMatchObject({ locale: 'pt-BR', language: 'pt', country: 'BR', emoji: '🇧🇷' });

    setLocale('pt-BR');
    expect(getLocaleInfo()?.emoji).toBe('🇧🇷'); // current-locale info
  });

  it('interpolates {tokens} from flat params', () => {
    registerMessages('en', { greet: 'Hi {name}' });
    expect(translate('greet', { name: 'Ann' })).toBe('Hi Ann');
    expect(translate('greet')).toBe('Hi {name}'); // no params → token left as-is
  });

  it('uses an inline fallback (string shorthand or {fallback}) when unregistered', () => {
    expect(translate('nope.title', 'Set up doop')).toBe('Set up doop');
    // flat params alongside the reserved `fallback` key
    expect(translate('nope.greet', { name: 'Ann', fallback: 'Hi {name}' })).toBe('Hi Ann');
    // a REGISTERED message wins over the fallback
    registerMessages('en', { greet: 'Hello' });
    expect(translate('greet', 'IGNORED')).toBe('Hello');
  });

  it('escapes \\{ and \\} to literal braces', () => {
    registerMessages('en', { lit: 'show \\{name\\} literally' });
    expect(translate('lit', { name: 'X' })).toBe('show {name} literally');
  });

  it('switches locale and falls back to fallbackLocale', () => {
    registerMessages('en', { a: 'A', b: 'Bonly' });
    registerMessages('pt', { a: 'Á' });
    setLocale('pt');
    expect(getLocale()).toBe('pt');
    expect(translate('a')).toBe('Á');
    expect(translate('b')).toBe('Bonly'); // missing in pt → en fallback
  });

  it('missing key returns a {key} marker', () => {
    expect(translate('no.such.key')).toBe('{no/such/key}');
  });

  it('allKeys unions across locales; listLocales lists them', () => {
    registerMessages('en', { a: '1' });
    registerMessages('pt', { b: '2' });
    expect(allKeys().sort()).toEqual(['a', 'b']);
    expect(listLocales().sort()).toEqual(['en', 'pt']);
  });
});
