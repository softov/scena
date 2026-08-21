export { validateArgs, isPermissionPath } from '../sdk/args-schema.js';
export type { ValidateArgsResult } from '../sdk/args-schema.js';

export { createSurfaceBridge } from './surface-bridge.js';
export {
  registerClientHandler,
  getClientHandler,
} from './client-handlers.js';
export { createInMemorySocket } from './in-memory-socket.js';
export type { InMemorySocket } from './in-memory-socket.js';
export { registerBuiltinFunctions } from '../core/builtins.js';
export { registerLayoutCommands } from './layout-commands.js';
export { registerOpenerCommands } from './opener-commands.js';
export type { RegisterOpenerCommandsOptions } from './opener-commands.js';
