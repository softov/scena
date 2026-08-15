import {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  Suspense,
  useEffect,
  useState,
} from 'react';
import type {
  LayoutDefinition,
  LayoutProps,
  SurfaceLayoutState,
  SurfacePresentation,
} from '../types/layout.js';
import type { SurfaceName, ResolvedMount } from '../types/mount-surface.js';
import { useScena } from './ScenaProvider.js';
import { useLayout } from './hooks/useLayout.js';
import { useMounts } from './hooks/useMounts.js';
import { MountWrapper, ViewMount } from './ViewMount.js';

function renderOneMount(mount: ResolvedMount): ReactNode {
  return (
    <MountWrapper mountKey={mount.key} dataContext={mount.dataContext}>
      <div className="oo-mount" data-mount-key={mount.key}>
        <ViewMount node={mount.component} />
      </div>
    </MountWrapper>
  );
}

function FallbackLayout({ mounts }: { mounts: ResolvedMount[] }) {
  return (
    <>
      {mounts.map((m) => (
        <div key={m.key} style={{ display: 'contents' }}>
          {renderOneMount(m)}
        </div>
      ))}
    </>
  );
}

export interface SurfaceAreaProps {
  surface: SurfaceName;
  layout?: string;
  style?: CSSProperties;
  className?: string;
  // How this surface occupies space. Positioning lives in styles/surface.css,
  // keyed on the emitted `data-presentation`. Defaults to 'docked', which is
  // the pre-existing behavior — the shell keeps full control via `style`.
  presentation?: SurfacePresentation;
}

export function SurfaceArea({
  surface,
  layout,
  style,
  className,
  presentation = 'docked',
}: SurfaceAreaProps) {
  const scena = useScena();
  const layoutState = useLayout();
  const mounts = useMounts(surface);
  const surfaceState: SurfaceLayoutState =
    layoutState.surfaces[surface] ?? { visible: true };
  const layoutId = surfaceState.layout ?? layout ?? 'default';

  const [registryTick, setRegistryTick] = useState(0);
  useEffect(() => {
    const sub = scena.events.on('scena:registry:changed', (payload) => {
      if ((payload as { registry: string }).registry === 'layouts') {
        setRegistryTick((t) => t + 1);
      }
    });
    return () => sub.dispose();
  }, [scena]);
  void registryTick;

  const layoutDef: LayoutDefinition | undefined = scena.layouts.get(layoutId);

  const setSurfaceState: LayoutProps['setState'] = (patch) => {
    scena.layout.setSurface(surface, patch);
  };

  const layoutProps: LayoutProps = {
    surface,
    mounts,
    state: surfaceState,
    presentation,
    setState: setSurfaceState,
    renderMount: renderOneMount,
    onActivate: (key) => scena.surfaces.focus(key),
    onClose: (key, opts) => scena.surfaces.close(key, opts),
    onReorder: (fromIndex, toIndex) => {
      const persistedOrder = surfaceState.split?.order ?? [];
      const orderSet = new Set(persistedOrder);
      const orderedKnown = persistedOrder.filter((k) =>
        mounts.some((m) => m.key === k),
      );
      const newKeys = mounts.filter((m) => !orderSet.has(m.key)).map((m) => m.key);
      const next = [...orderedKnown, ...newKeys];
      const [moved] = next.splice(fromIndex, 1);
      if (moved !== undefined) next.splice(toIndex, 0, moved);
      // Spread the existing split so newer fields like `pinned` survive
      // the write; the prior explicit pick dropped anything not listed.
      scena.layout.setSurface(surface, {
        split: {
          ...(surfaceState.split ?? {}),
          order: next,
        },
      });
    },
  };

  return (
    <div
      data-surface={surface}
      data-presentation={presentation}
      className={[
        'oo-surface',
        `oo-surface--${surface.replace(':', '-')}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {layoutDef ? (
        (() => {
          // Layout components are lazy (see ui/layout/register.ts) — render
          // inside Suspense so the first use of a strategy can load its chunk.
          const Layout = layoutDef.component as ComponentType<LayoutProps>;
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Layout {...layoutProps} />
            </Suspense>
          );
        })()
      ) : (
        <FallbackLayout mounts={mounts} />
      )}
    </div>
  );
}
