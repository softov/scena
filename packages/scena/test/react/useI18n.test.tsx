// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { registerMessages, setLocale, clearMessages } from '../../src/core/i18n/registry.js';
import { useI18n } from '../../src/react/hooks/useI18n.js';

beforeEach(() => clearMessages());

describe('useI18n', () => {
  it('translates + interpolates (flat params), re-renders on locale switch', async () => {
    registerMessages('en', { greet: 'Hello {name}' });
    registerMessages('pt', { greet: 'Olá {name}' });
    const { result } = renderHook(() => useI18n());
    expect(result.current.t('greet', { name: 'A' })).toBe('Hello A');
    await act(async () => {
      setLocale('pt');
    });
    expect(result.current.t('greet', { name: 'A' })).toBe('Olá A');
    expect(result.current.locale).toBe('pt');
  });

  it('namespace + string-shorthand fallback', () => {
    registerMessages('en', { setup: { title: 'Set up' } });
    const { result } = renderHook(() => useI18n('setup'));
    expect(result.current.t('title')).toBe('Set up');
    expect(result.current.t('missing', 'Default')).toBe('Default');
  });
});
