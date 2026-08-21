import type { Scena } from '../sdk/scena.js';
import type { Disposable } from '../sdk/disposable.js';
import { combineDisposables } from '../sdk/disposable.js';
import { Limen } from './Limen.js';

// Registers the porta blocks as scena components so they can be referenced
// by name from ComponentNode trees and agent-sent payloads.
//
//   Porta.LoginForm  — the composer
//   Porta.Sigillum   — silent permission gate
//   Porta.PortaLock  — inline gate with visible LoginForm fallback
//   Porta.Limen      — full-page wall with header / footer / left / right slots
export function registerPortaBlocks(scena: Scena): Disposable {
  return combineDisposables(
    scena.components.register({
      component: 'Porta.LoginForm',
      category: 'page',
      renderer: { kind: 'react', load: async () => import('../ui/forms/LoginForm.js') },
    }),
    scena.components.register({
      component: 'Porta.PortaLock',
      category: 'page',
      renderer: { kind: 'react', load: async () => import('./PortaLock.js') },
    }),
    scena.components.register({
      component: 'Porta.Sigillum',
      category: 'page',
      renderer: { kind: 'react', load: async () => import('./SigillumGate.js') },
    }),
    scena.components.register({
      component: 'Porta.Limen',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Limen }) },
    }),
  );
}
