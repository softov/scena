import type { Disposable } from '../types/disposable.js';

export function combineDisposables(...disposables: (Disposable | undefined)[]): Disposable {
  return {
    dispose() {
      for (const d of disposables) {
        if (!d) continue;
        try {
          d.dispose();
        } catch {
          // Swallow individual disposal errors so one failure doesn't strand others.
        }
      }
    },
  };
}

export function disposableFrom(fn: () => void): Disposable {
  return { dispose: fn };
}
