import { describe, it, expect } from 'vitest';
import { createScena } from '../src/core/scena.js';

/**
 * The two seams a caller can get wrong in silence.
 *
 * `execute(id, args?: unknown)` and a mount resource of `component: string`
 * plus arbitrary props put the caller and the handler in different files with
 * nothing between them. An argument named one way at one end and read another
 * way at the other compiled, ran, and did nothing - and no test could have
 * caught it, because both halves were individually correct.
 *
 * So most of what is asserted here is asserted by the compiler rather than by
 * vitest. `accepted` and `rejected` below are never called: they exist to be
 * typechecked by `tsc -p tsconfig.test.json`, where every `@ts-expect-error`
 * fails the build if the line it marks turns out to be allowed. That is the
 * only way to test that a type refuses something.
 *
 * The tests that do run are at the bottom, because a declaration that
 * describes the wrong runtime is worse than none.
 */

declare module '../src/sdk/command.js' {
  interface CommandArgs {
    'test.open': { uri?: string; host?: string };
    'test.rename': { to: string };
  }
}

declare module '../src/sdk/component-graph.js' {
  interface ComponentProps {
    'Test.Panel': { resourceId?: string; host?: string };
  }
}

const scena = createScena();

/** Calls that must compile. Never invoked. */
function accepted(): void {
  void scena.commands.execute('test.open', { uri: 'x', host: 'code-server' });

  // A command whose arguments are all optional is callable with none, which is
  // the ordinary case: most read their fallback from the store.
  void scena.commands.execute('test.open');

  void scena.commands.execute('test.rename', { to: 'other' });

  // No declaration for this id, so it keeps the untyped signature and means
  // what it always meant. This is the whole of the existing surface.
  void scena.commands.execute('some.app.command', { whatever: true });

  scena.surfaces.mount({
    surface: 'sidebar:right',
    key: 'test:panel',
    resource: { component: 'Test.Panel', resourceId: 'a', host: 'code-server' },
  });

  // A placeholder that sits in a surface until something is opened into it.
  // This is why props are declared optional rather than required.
  scena.surfaces.mount({
    surface: 'sidebar:right',
    key: 'test:placeholder',
    resource: { component: 'Test.Panel' },
  });

  scena.surfaces.mount({
    surface: 'main',
    key: 'test:undeclared',
    resource: { component: 'Some.App.Panel', anything: 1 },
  });

  // A mount target is a node *or* a binding that resolves to one. A binding
  // names no component, so there is nothing to check it against.
  scena.surfaces.mount({
    surface: 'main',
    key: 'test:bound',
    resource: { path: '$/test/node' },
  });
}

/** Registrations that must compile. Never invoked. */
function registrable(): void {
  // The ordinary command: something to run, here.
  scena.commands.register({ id: 'a.local', title: 'Local', run: () => {} });

  // A handler that also falls back to the socket.
  scena.commands.register({
    id: 'a.either', title: 'Either', dispatch: 'either', run: () => {},
  });

  // Nothing to run here, and it says so. This is the only way to register a
  // command with no handler, which is what makes the absence deliberate
  // rather than forgotten.
  scena.commands.register({ id: 'a.remote', title: 'Remote', dispatch: 'remote' });
}

/** Calls that must not compile. Never invoked. */
function rejected(): void {
  // The `093050a` bug exactly: the caller says `hostId`, the handler reads
  // `host`. Every declared prop is optional, so this is not a missing
  // argument - it is a key nobody reads, which is why it went unnoticed for
  // as long as it did.
  // @ts-expect-error - 'hostId' is not declared on 'test.open'
  void scena.commands.execute('test.open', { uri: 'x', hostId: 'code-server' });

  // @ts-expect-error - 'host' is a string
  void scena.commands.execute('test.open', { host: 3 });

  // @ts-expect-error - 'to' is required on 'test.rename'
  void scena.commands.execute('test.rename');

  scena.surfaces.mount({
    surface: 'sidebar:right',
    key: 'test:panel',
    // @ts-expect-error - 'hostId' is not declared on 'Test.Panel'
    resource: { component: 'Test.Panel', resourceId: 'a', hostId: 'code-server' },
  });

  // A command that does nothing. It registered, and threw the moment anybody
  // invoked it - `executeFrom` ends in a guard written for exactly this.
  // @ts-expect-error - no 'run', and it did not say it was remote
  scena.commands.register({ id: 'a.nothing', title: 'Nothing' });

  // Claiming to run here while carrying nothing to run.
  // @ts-expect-error - dispatch 'client' requires a handler
  scena.commands.register({ id: 'a.lying', title: 'Lying', dispatch: 'client' });

  // The directive sits on the statement, not on `run`: the whole object fails
  // to match either arm of the union, so that is where the error lands.
  // @ts-expect-error - a remote command has nothing to run here
  scena.commands.register({ id: 'a.x', title: 'X', dispatch: 'remote', run: () => {} });
}

describe('the typed seams', () => {
  it('states its assertions to the compiler, not to vitest', () => {
    // All three are dead code by design. Naming them here keeps them from reading
    // as an oversight, and keeps a linter from removing what the build needs.
    expect([accepted, registrable, rejected].every((fn) => typeof fn === 'function')).toBe(true);
  });

  it('hands the handler the arguments the caller sent', async () => {
    let seen: unknown;
    scena.commands.register({
      id: 'test.open',
      title: 'Open',
      // `args` is typed from the declaration rather than `unknown`, so this
      // reads `args?.host` with no cast - and a cast is what hid the bug: it
      // asserted the shape the handler wanted instead of checking the shape
      // the caller sent.
      run: (_ctx, args) => { seen = args?.host; },
    });

    await scena.commands.execute('test.open', { uri: 'x', host: 'code-server' });
    expect(seen).toBe('code-server');
  });
});
