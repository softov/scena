import { useEffect, type ReactElement } from 'react';
import type { Disposable, Scena, ScopeBackendFactory } from '@softov/scena/types';
import {
  createLocalStorageLayoutStorage,
  createModusBackend,
  registerLayoutCommands,
} from '@softov/scena';
import { Scena as ScenaRoot, useScena } from '@softov/scena/react/core';
import { DefaultShell } from '@softov/scena/react';
import { registerApp } from './register-app.js';
import { DEMO_PRESENTATION } from './presentation.js';

const layoutStorage = createLocalStorageLayoutStorage({ key: 'scena-demo.layout.v1' });

// `$/modus/*` publishes the display environment (size class, orientation,
// pointer accuracy). DEMO_PRESENTATION in presentation.ts is a policy over
// `$/modus/class`, so without this backend the policy has nothing to read.
const backendFactories: ScopeBackendFactory[] = [
  { scope: 'modus', create: () => createModusBackend() },
];

// STABLE identity — an inline object re-initialises scena on every render.
const options = { layoutStorage, backendFactories };

/**
 * Everything the app registers, for as long as it is mounted.
 *
 * There is no sign-in here, so unlike Advisor and the playground there is no
 * reason to split boot from post-login: one effect registers the lot. That is
 * the simplification this app is for — if something only works in those two
 * because of *when* it gets registered, it breaks here and says so.
 */
function AppRegistrations({ children }: { children: ReactElement }): ReactElement {
  const scena = useScena();

  useEffect(() => {
    let sub: Disposable | undefined;
    try {
      sub = registerApp(scena);
    } catch (error) {
      console.error('[scena-demo] registerApp failed:', error);
    }
    return () => sub?.dispose();
  }, [scena]);

  return children;
}

export default function App(): ReactElement {
  function onRender(scena: Scena): void {
    registerLayoutCommands(scena);
  }

  return (
    <ScenaRoot options={options} onRender={onRender}>
      <AppRegistrations>
        {/*
          scena's own DefaultShell, not a hand-written one. The playground and
          Advisor both compose SurfaceArea themselves, which means the shipped
          shell is the least-exercised thing in the package -- so this app uses
          it, and anything missing from it shows up as a missing feature rather
          than as something each app quietly wrote for itself.

          That worked: the shell used to ignore the presentation policy and
          render no scrim, which this app reported live in its status bar until
          the shell learned to do both. Narrow the window now and the sidebar
          lifts over `main` with a scrim behind it.
        */}
        <DefaultShell presentation={DEMO_PRESENTATION} />
      </AppRegistrations>
    </ScenaRoot>
  );
}
