import type { Scena } from '../types/scena.js';
import type { Disposable } from '../types/disposable.js';
import { combineDisposables } from '../core/disposable.js';
import { LoginForm } from '../ui/forms/LoginForm.js';
import { PortaLock } from './PortaLock.js';
import { Sigillum } from './SigillumGate.js';
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
      renderer: { kind: 'react', load: async () => ({ default: LoginForm as unknown }) },
    }),
    scena.components.register({
      component: 'Porta.PortaLock',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: PortaLock as unknown }) },
    }),
    scena.components.register({
      component: 'Porta.Sigillum',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Sigillum as unknown }) },
    }),
    scena.components.register({
      component: 'Porta.Limen',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Limen as unknown }) },
    }),
  );
}
