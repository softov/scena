// The package root export (`@softov/scena`).
//
// core/ is the store, the graph, the resolvers and the registries; runtime/ is
// the behaviour wired on top of a live scena — the surface bridge, the sockets,
// and the layout/opener command sets. Both are flat on the root surface, but
// they are assembled here rather than inside core/index.ts, so that core never
// imports the layer built on it.
export * from './core/index.js';

export { createSurfaceBridge } from './runtime/surface-bridge.js';
export {
  registerClientHandler,
  getClientHandler,
} from './runtime/client-handlers.js';
export { createInMemorySocket } from './runtime/in-memory-socket.js';
export type { InMemorySocket } from './runtime/in-memory-socket.js';
export { registerLayoutCommands } from './runtime/layout-commands.js';
export { registerOpenerCommands } from './runtime/opener-commands.js';
export type { RegisterOpenerCommandsOptions } from './runtime/opener-commands.js';
