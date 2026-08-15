import type { Disposable } from '../types/disposable.js';

// Plugin-side client handlers for FunctionCall ids that need an inline JS
// implementation (typically declared with `callableFrom: 'clientOnly'`).
//
// Scena itself does not consult this registry; it is a parking lot plugin
// authors can use to expose handlers that other plugin code (or a custom
// dynamic-resolver bridge) looks up at call time.
const clientHandlers = new Map<
  string,
  (args: Record<string, unknown>) => unknown | Promise<unknown>
>();

export function registerClientHandler(
  name: string,
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>,
): Disposable {
  clientHandlers.set(name, handler);
  return {
    dispose() {
      if (clientHandlers.get(name) === handler) clientHandlers.delete(name);
    },
  };
}

export function getClientHandler(
  name: string,
): ((args: Record<string, unknown>) => unknown | Promise<unknown>) | undefined {
  return clientHandlers.get(name);
}
