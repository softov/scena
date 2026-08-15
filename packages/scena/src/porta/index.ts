// Public surface for `@softov/scena/porta`.

export { createPorta } from './register.js';
export type { Porta, CreatePortaOpts } from './register.js';

// Runtime sigillum facade — `session()`, `has(scope)`, `isPending()`, …
// Type is re-exported as `SigillumRuntime` to avoid colliding with the
// React component `<Sigillum>` below.
export { createSigillum, SIGILLUM_PATHS } from './sigillum.js';
export type { Sigillum as SigillumRuntime } from './sigillum.js';

export { registerSigillumCommands } from './commands.js';

export type {
  PortaProvider,
  PortaProviderKind,
  AuthField,
  Session,
  ProviderRenderContext,
} from './provider.js';

export { passwordProvider } from './providers/password.js';
export type { PasswordProviderOpts, PasswordUser } from './providers/password.js';

export { PortaProvider as PortaContextProvider, usePorta, useSession } from './PortaContext.js';

// Three React gates, distinct intents:
//   <Sigillum>  — silent gate. Renders children or nothing (or `fallback`).
//   <PortaLock> — inline gate. Renders a bordered fallback (LoginForm by default).
//   <Limen>     — full-page wall. Centered Porta + top/bottom/left/right slots.
// Sigillum.tsx was renamed to SigillumGate.tsx to avoid a case-collision
// with sigillum.ts on case-insensitive filesystems (Windows). The component
// is still exported as `Sigillum`.
export { Sigillum } from './SigillumGate.js';
export type { SigillumProps } from './SigillumGate.js';

export { PortaLock } from './PortaLock.js';
export type { PortaLockProps } from './PortaLock.js';

export { Limen } from './Limen.js';
export type { LimenProps } from './Limen.js';

export { hasScope } from './match.js';
export { loginFormBlock } from './login-form.block.js';
export { registerPortaBlocks } from './register-blocks.js';
