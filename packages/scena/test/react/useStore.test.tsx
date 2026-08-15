// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { useStore } from '../../src/react/hooks/useStore.js';
import type { BindingPath } from '../../src/types/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function wrapperFor(scena: ReturnType<typeof createScena>) {
  return ({ children }: { children: ReactNode }) =>
    createElement(ScenaProvider, { scena }, children);
}

describe('useStore', () => {
  it('re-renders when the bound path changes', async () => {
    const scena = createScena();
    const { result } = renderHook(() => useStore<number>(p('$/a/x')), {
      wrapper: wrapperFor(scena),
    });
    expect(result.current).toBeUndefined();
    await act(async () => {
      scena.store.set(p('$/a/x'), 5);
      await tick();
    });
    expect(result.current).toBe(5);
  });

  it('undefined path is a no-op', () => {
    const scena = createScena();
    const { result } = renderHook(() => useStore(undefined), {
      wrapper: wrapperFor(scena),
    });
    expect(result.current).toBeUndefined();
  });
});
