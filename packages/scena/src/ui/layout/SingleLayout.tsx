import type { LayoutProps } from '../../types/layout.js';
import type { ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { SectionHeader } from './SectionHeader.js';
import { useMountTitle } from './MountTitle.js';

// One mount fills the surface; no tab strip. Active mount picked via
// `state.activeContainerKey`, falling back to the most recently opened. When the
// active mount declares a title/icon/actions (mount.props ?? component.props), a
// SectionHeader strip renders above it — this is how sidebar sections get their
// `[icon Title] [actions] [⋯]` header.
export function SingleLayout({ mounts, state, renderMount }: LayoutProps) {
  const scena = useScena();
  const active =
    mounts.find((m) => m.key === state.activeContainerKey) ??
    mounts[mounts.length - 1];

  const compProps = active ? scena.components.get(active.component.component)?.props : undefined;
  const titleLabel = active?.props?.title ?? compProps?.title;
  const title = useMountTitle(active, '');
  const icon = active?.props?.icon ?? compProps?.icon;
  const color = active?.props?.color ?? compProps?.color;
  const actions = active?.props?.actions ?? compProps?.actions;
  const showHeader = Boolean(titleLabel || (actions && actions.length));

  return (
    <div
      className="oo-layout oo-layout--single"
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {showHeader ? <SectionHeader title={title || active?.key || ''} icon={icon} color={color} actions={actions} /> : null}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {mounts.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>Nothing open.</div>
        ) : (
          // Keep every mount mounted; show only the active one so switching
          // between mounts doesn't unmount (and reset) the others.
          mounts.map((m) => (
            <div
              key={m.key}
              className="oo-layout__mount"
              data-active={m === active || undefined}
              style={{ position: 'absolute', inset: 0, overflow: 'auto', display: m === active ? 'block' : 'none' }}
            >
              {renderMount(m) as ReactNode}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
