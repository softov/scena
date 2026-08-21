import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStoreLabel } from '../../react/hooks/useStoreLabel.js';
import { readPath } from '../../core/resolve/path-resolver.js';
import { translate } from '../../core/i18n/registry.js';
import type { Scena } from '../../sdk/scena.js';
import type { ResolvedMount } from '../../sdk/mount-surface.js';
import type { Label } from '../../sdk/label.js';
import type { BindingPath } from '../../sdk/component-graph.js';

// Shared title resolution for layout headers. A mount's title is
// `mount.props.title ?? the component's registered default`, resolved against
// the mount's OWN dataContext — so a relative `{ path: '/name' }` resolves to
// this record (set by `openResource`) and updates live on change.

// Reactive — for component scopes (SpatialCard, SingleLayout, the TabTitle).
export function useMountTitle(mount: ResolvedMount | undefined, fallback = ''): string {
  const scena = useScena();
  const compProps = mount ? scena.components.get(mount.component.component)?.props : undefined;
  return useStoreLabel(mount?.props?.title ?? compProps?.title, '', mount?.dataContext) || fallback;
}

// Reactive icon + title text + truncation tooltip — the label cluster shared by
// every layout header. Rendered as a CHILD component (not a hook in a `.map()`
// body) so it stays reactive inside inline list renders (split panes, stack
// sections).
export function MountTitle({
  mount,
  fallback,
  iconClassName,
  titleClassName,
  style,
}: {
  mount: ResolvedMount | undefined;
  fallback?: string;
  iconClassName?: string;
  titleClassName?: string;
  style?: CSSProperties;
}): ReactNode {
  const scena = useScena();
  const compProps = mount ? scena.components.get(mount.component.component)?.props : undefined;
  const title = useStoreLabel(mount?.props?.title ?? compProps?.title, '', mount?.dataContext) || (fallback ?? '');
  const icon = mount?.props?.icon ?? compProps?.icon;
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, ...style }}>
      {icon ? (
        <span className={iconClassName} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span
        className={titleClassName}
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {title}
      </span>
    </span>
  );
}

// One-shot (non-reactive) resolve — for contexts where a hook can't run, e.g.
// building ContextMenu item strings inside a `.map()`. Resolves a `{ path }`
// via readPath against the mount's dataContext (so relative titles work); the
// menu re-resolves each time it opens, so non-reactive is fine.
export function resolveMountTitle(scena: Scena, mount: ResolvedMount): string {
  const compProps = scena.components.get(mount.component.component)?.props;
  const label = (mount.props?.title ?? compProps?.title) as Label | undefined;
  if (label == null) return mount.key;
  if (typeof label === 'string') return label;
  if ('t' in label) return translate(label.t);
  const value = readPath(scena.store, mount.dataContext, label.path as BindingPath);
  return value == null ? mount.key : String(value);
}
