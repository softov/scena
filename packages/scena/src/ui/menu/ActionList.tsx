import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PickerAction, HostCtx, ListSpec } from '../../types/host.js';
import type { Command, CommandContext } from '../../types/command.js';
import type { BindingPath } from '../../types/component-graph.js';
import { useScena } from '../../react/ScenaProvider.js';
import { canonicalShortcut } from './token.js';
import './ActionList.css';
import { resolveColorVar } from '../../types/colors.js';

// ---------- Internal row shape -------------------------------------------------

// Normalized row the renderer works with. Synthetic actions become this
// directly; command references resolve title/icon/active from the registry.
interface Row {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  // Chat typed-prefix (e.g. '/agent', '@persona') — what the user types into
  // a chat input to trigger this command. Renders as <kbd> on the left of
  // the row. Set from Command.shortcut.
  shortcut?: string;
  // Keyboard binding (e.g. 'ctrl+shift+p', 'ctrl+k z') — the global hotkey.
  // Renders as <kbd> on the right of the row, alongside the typed prefix when
  // both are present. Set from Command.keys.
  keys?: string;
  group?: string;
  category?: string;
  active?: boolean;
  disabled?: boolean;
  // Bound dispatcher — called when the row is selected. Captures the
  // command ref or synthetic closure once at resolve time.
  invoke: (host: HostCtx) => void | Promise<void>;
}

// Debounce (ms) for async provider re-resolves while results are already on
// screen — collapses a burst of keystrokes into one network call.
const PROVIDER_DEBOUNCE_MS = 180;

// ---------- ActionList ---------------------------------------------------------

// Imperative handle exposed via `ref`. Hosts that own their own keyboard
// (chat textareas) call `handleKey` from their own onKeyDown instead of
// letting ActionList attach a document-level listener — otherwise every
// visible ActionList would respond to every key press, so opening two chat
// pickers at once would move both highlights on a single ArrowDown.
export interface ActionListController {
  handleKey(e: { key: string; preventDefault: () => void }): boolean;
}

export interface ActionListProps {
  spec: ListSpec;
  hostCtx: HostCtx;
  // Back arrow appears when defined; host hook supplies this only when
  // the picker stack depth > 1.
  onBack?: () => void;
  // Mount root for relative-path writes during command execution. Commands
  // joinAbsolute(dataContext, '/foo'); without this, every menu-invoked
  // command writes to the global `$/` root regardless of which chat panel
  // (or other instance) opened the picker.
  dataContext?: BindingPath;
  // When false, ActionList skips its document-level keydown listener and
  // the host must call `controller.handleKey` from its own onKeyDown.
  // Defaults to true so popup hosts (ContextMenu) keep their existing
  // free-floating keyboard behavior.
  manageKeys?: boolean;
  // Imperative handle for `manageKeys: false` hosts.
  ref?: Ref<ActionListController>;
}

type ResolvedItems =
  | { kind: 'ready'; rows: Row[] }
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

export function ActionList({
  spec,
  hostCtx,
  onBack,
  dataContext,
  manageKeys = true,
  ref,
}: ActionListProps) {
  const scena = useScena();
  const [selected, setSelected] = useState(0);
  const [resolved, setResolved] = useState<ResolvedItems>({ kind: 'loading' });
  // True while an async provider is re-resolving but we're still showing the
  // previous rows (so the list doesn't flash to a "Loading…" screen on every
  // keystroke — see the provider branch below). Drives the header spinner.
  const [pending, setPending] = useState(false);
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;
  const itemsRef = useRef<HTMLDivElement>(null);

  // Title / icon / active / disabled for a Command — evaluated against the
  // panel's dataContext so per-instance reads (e.g. a chat command's `active`
  // reading `$/chat/<id>/mode`) resolve to THIS panel's root, not the global
  // fallback. Re-resolved when the registry/store announces a change.
  const stubCtx = useMemo<CommandContext>(() => ({
    scena,
    store: scena.store,
    surfaces: scena.surfaces,
    commands: scena.commands,
    events: scena.events,
    source: 'menu',
    dataContext,
  }), [scena, dataContext]);

  const rowsFromCommands = useCallback((cmds: Command[]): Row[] => {
    return cmds.map((c) => {
      const title = typeof c.title === 'function' ? c.title(stubCtx) : c.title;
      const description = typeof c.description === 'function' ? c.description(stubCtx) : c.description;
      const active = c.active ? !!c.active(stubCtx) : undefined;
      const disabled = c.disabled ? !!c.disabled(stubCtx) : undefined;
      return {
        key: `cmd:${c.id}`,
        title,
        description,
        icon: c.icon,
        color: c.color,
        shortcut: canonicalShortcut(c.shortcut),
        keys: canonicalShortcut(c.keys),
        category: c.category,
        active,
        disabled,
        invoke: (host) => {
          // Autocomplete the typed token to the command's canonical shortcut
          // (e.g. '/mod' → '/model') so the input matches the submenu it opens
          // and the picker's sentinel keeps the submenu open. No-op on hosts
          // without a text input (context menus stub replaceActiveToken).
          const sc = canonicalShortcut(c.shortcut);
          if (sc) host.replaceActiveToken(sc);
          void scena.commands.execute(c.id, undefined, {
            source: 'menu',
            dataContext,
            host,
          });
        },
      };
    });
  }, [scena, stubCtx, dataContext]);

  const rowsFromActions = useCallback((actions: PickerAction[]): Row[] => {
    return actions.map((a, i): Row => {
      if ('commandId' in a) {
        const cmd = scena.commands.get(a.commandId);
        if (!cmd) {
          return {
            key: `cmd:${a.commandId}:${i}`,
            title: `[${a.commandId}]`,
            disabled: true,
            invoke: () => undefined,
          };
        }
        const row = rowsFromCommands([cmd])[0]!;
        const args = a.args;
        return {
          ...row,
          key: `cmd:${a.commandId}:${i}`,
          invoke: (host) => {
            void scena.commands.execute(cmd.id, args, {
              source: 'menu',
              dataContext,
              host,
            });
          },
        };
      }
      return {
        key: `act:${i}:${a.title}`,
        title: a.title,
        description: a.description,
        icon: a.icon,
        color: a.color,
        shortcut: a.shortcut,
        keys: a.keys,
        group: a.group,
        active: a.active,
        disabled: a.disabled,
        invoke: a.onSelect,
      };
    });
  }, [scena, rowsFromCommands, dataContext]);

  // Resolve `spec` to a list of rows. Three modes: items, provider, query.
  // Provider may return a Promise — loading state shown until it resolves.
  // `spec.extraItems` (registry-injected rows) are prepended in every mode.
  useEffect(() => {
    let cancelled = false;
    const extra = spec.extraItems ? rowsFromActions(spec.extraItems) : [];

    if (spec.items) {
      setPending(false);
      setResolved({ kind: 'ready', rows: [...extra, ...rowsFromActions(spec.items)] });
      return () => {
        cancelled = true;
      };
    }

    if (spec.query) {
      setPending(false);
      const querySlot = spec.query.slot;
      const queryQ = spec.query.q;
      const resolveQuery = (): void => {
        const cmds = scena.commands.list({
          slot: querySlot,
          q: queryQ,
          enabled: true,
        });
        if (!cancelled) setResolved({ kind: 'ready', rows: [...extra, ...rowsFromCommands(cmds)] });
      };
      resolveQuery();

      // Re-resolve on registry changes (newly-registered commands appear)
      // AND on any store path change (so toggle commands like /plan show
      // their ✓ live without waiting for the next menu open). Store
      // updates can fire densely — coalesce to one rAF.
      let scheduled = false;
      function schedule() {
        if (scheduled || cancelled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (!cancelled) resolveQuery();
        });
      }
      const subRegistry = scena.events.on('scena:registry:changed', (payload) => {
        const reg = (payload as { registry: string }).registry;
        if (reg !== 'commands' && reg !== 'components') return;
        schedule();
      });
      const subStore = scena.events.on('scena:store:changed', () => {
        schedule();
      });
      return () => {
        cancelled = true;
        subRegistry.dispose();
        subStore.dispose();
      };
    }

    if (spec.provider) {
      const provider = spec.provider;
      const run = (): void => {
        if (cancelled) return;
        let out: PickerAction[] | Promise<PickerAction[]>;
        try {
          out = provider(hostCtx);
        } catch (err) {
          setResolved({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
          setPending(false);
          return;
        }
        if (out instanceof Promise) {
          out
            .then((actions) => {
              if (cancelled) return;
              setResolved({ kind: 'ready', rows: [...extra, ...rowsFromActions(actions)] });
              setPending(false);
            })
            .catch((err: unknown) => {
              if (cancelled) return;
              setResolved({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
              setPending(false);
            });
        } else {
          setResolved({ kind: 'ready', rows: [...extra, ...rowsFromActions(out)] });
          setPending(false);
        }
      };

      // Keep the prior rows, show the header spinner, and debounce — used for
      // re-resolves (typing, or a store change below).
      let timer: ReturnType<typeof setTimeout> | null = null;
      const scheduleRun = (): void => {
        if (cancelled) return;
        setPending(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, PROVIDER_DEBOUNCE_MS);
      };

      // First resolve (nothing shown yet) → full "Loading…" + run immediately.
      if (resolvedRef.current.kind !== 'ready') {
        setResolved({ kind: 'loading' });
        run();
      } else {
        scheduleRun();
      }

      // Re-resolve on store changes so a provider whose rows depend on store
      // state (e.g. the /mode submenu's active ✓) reflects external updates —
      // like the composer's mode button toggling `$/chat/<id>/mode` while the
      // menu is open. Debounced + keep-rows so network providers stay smooth.
      const subStore = scena.events.on('scena:store:changed', () => scheduleRun());
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        subStore.dispose();
      };
    }

    setPending(false);
    setResolved({ kind: 'ready', rows: extra });
    return () => {
      cancelled = true;
    };
  }, [spec, hostCtx, rowsFromActions, rowsFromCommands, scena]);

  // Flat list of selectable rows (skip group headers and disabled rows).
  const interactiveRows = useMemo(() => {
    if (resolved.kind !== 'ready') return [];
    return resolved.rows.filter((r) => !r.disabled);
  }, [resolved]);

  // Reset highlight when the row set changes.
  useEffect(() => {
    setSelected(0);
  }, [interactiveRows.length]);

  // Scroll selected into view.
  useEffect(() => {
    const el = itemsRef.current;
    if (!el) return;
    const selectedEl = el.querySelector<HTMLElement>('[data-selected="true"]');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Track focused row for layout='info-list' detail panel.
  const focusedRow = interactiveRows[selected];

  // ---------- Group rows by category --------------------------------------
  const grouped = useMemo(() => {
    if (resolved.kind !== 'ready') return [] as Array<{ label: string | null; rows: Row[] }>;
    const order = spec.groupOrder ?? [];
    const buckets = new Map<string, Row[]>();
    const orderSeen: string[] = [];
    for (const r of resolved.rows) {
      const k = r.category ?? r.group ?? '';
      if (!buckets.has(k)) {
        buckets.set(k, []);
        if (!orderSeen.includes(k)) orderSeen.push(k);
      }
      buckets.get(k)!.push(r);
    }
    const sortedKeys = [
      ...order.filter((k) => buckets.has(k)),
      ...orderSeen.filter((k) => !order.includes(k)),
    ];
    return sortedKeys.map((k) => ({
      label: k === '' ? null : k,
      rows: buckets.get(k)!,
    }));
  }, [resolved, spec.groupOrder]);

  // ---------- Keyboard handler --------------------------------------------
  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>): boolean => {
    if (interactiveRows.length === 0 && e.key !== 'Escape' && e.key !== 'ArrowLeft') return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((p) => (p + 1) % interactiveRows.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((p) => (p - 1 + interactiveRows.length) % interactiveRows.length);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const row = interactiveRows[selected];
      if (row) void row.invoke(hostCtx);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hostCtx.closeMenu();
      return true;
    }
    if (e.key === 'ArrowLeft' && onBack) {
      e.preventDefault();
      onBack();
      return true;
    }
    return false;
  }, [interactiveRows, selected, hostCtx, onBack]);

  // Document-level key listener for popup hosts (ContextMenu). Chat hosts
  // disable it via `manageKeys: false` and route keys through the
  // `controller.handleKey` exposed via ref — otherwise two visible pickers
  // would both react to a single ArrowDown press.
  useEffect(() => {
    if (!manageKeys) return;
    function onDocKey(e: KeyboardEvent) {
      const synth = {
        key: e.key,
        preventDefault: () => e.preventDefault(),
      } as unknown as ReactKeyboardEvent<HTMLDivElement>;
      handleKeyDown(synth);
    }
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [handleKeyDown, manageKeys]);

  // Imperative controller — only consumed when `manageKeys: false`.
  useImperativeHandle(
    ref,
    (): ActionListController => ({
      handleKey: (e) => handleKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>),
    }),
    [handleKeyDown],
  );

  // ---------- Render -------------------------------------------------------

  let visibleIndex = -1;
  const rich = spec.rich === true;

  function renderRow(row: Row): ReactNode {
    const isInteractive = !row.disabled;
    if (isInteractive) visibleIndex += 1;
    const isSelected = isInteractive && visibleIndex === selected;
    const capturedIndex = visibleIndex;
    const inlineStyle = row.color
      ? ({ ['--oo-color' as string]: resolveColorVar(row.color) } as React.CSSProperties)
      : undefined;
    return (
      <button
        key={row.key}
        className="oo-action-list__row"
        type="button"
        disabled={row.disabled}
        data-cmd-group={row.group}
        data-cmd-category={row.category}
        data-color={row.color}
        data-active={row.active ? 'true' : undefined}
        data-disabled={row.disabled ? 'true' : undefined}
        data-selected={isSelected ? 'true' : undefined}
        style={inlineStyle}
        onMouseEnter={() => { if (isInteractive) setSelected(capturedIndex); }}
        onClick={() => { if (isInteractive) void row.invoke(hostCtx); }}
      >
        <span className="oo-icon">{row.icon ?? '·'}</span>
        {rich ? (
          <span className="oo-action-list__text">
            <span className="oo-action-list__title">{row.title}</span>
            {row.description ? (
              <span className="oo-action-list__subtitle">{row.description}</span>
            ) : null}
          </span>
        ) : (
          <>
            <span className="oo-action-list__title">{row.title}</span>
            {row.description ? (
              <span className="oo-action-list__description">{row.description}</span>
            ) : null}
          </>
        )}
        {row.active ? <span className="oo-action-list__check">✓</span> : null}
        {row.shortcut ? (
          <kbd className="oo-action-list__shortcut">{row.shortcut}</kbd>
        ) : null}
        {row.keys ? (
          <kbd className="oo-action-list__shortcut">{row.keys}</kbd>
        ) : null}
      </button>
    );
  }

  function renderBody(): ReactNode {
    if (resolved.kind === 'loading') {
      return <div className="oo-action-list__loading">Loading…</div>;
    }
    if (resolved.kind === 'error') {
      return <div className="oo-action-list__error">{resolved.message}</div>;
    }
    if (grouped.length === 0 || resolved.rows.length === 0) {
      return <div className="oo-action-list__empty">No matches</div>;
    }
    return (
      <>
        {grouped.map((group, gi) => (
          <div key={group.label ?? `__g${gi}`}>
            {gi > 0 ? <div className="oo-action-list__divider" /> : null}
            {group.label ? (
              <div className="oo-action-list__group-label">{group.label}</div>
            ) : null}
            {group.rows.map(renderRow)}
          </div>
        ))}
      </>
    );
  }

  const layout = spec.layout ?? 'list';
  const showHeader = layout === 'header-list' && spec.header;
  const showDetail = layout === 'info-list' && spec.detail;

  return (
    <div className="oo-action-list" data-layout={layout}>
      {pending ? <div className="oo-action-list__pending" aria-hidden>searching…</div> : null}
      {onBack ? (
        <button type="button" className="oo-action-list__back" onClick={onBack}>
          ← {spec.title ?? 'Back'}
        </button>
      ) : null}
      {spec.customHeader ? (
        <div className="oo-action-list__custom-header">
          {spec.customHeader(hostCtx) as ReactNode}
        </div>
      ) : null}
      {showHeader ? (
        <div className="oo-action-list__header">
          {spec.header!(hostCtx) as ReactNode}
        </div>
      ) : null}
      <div className="oo-action-list__body">
        <div className="oo-action-list__items" ref={itemsRef}>
          {renderBody()}
        </div>
        {showDetail ? (
          <div className="oo-action-list__detail">
            {spec.detail!(hostCtx, focusedRow as unknown as PickerAction) as ReactNode}
          </div>
        ) : null}
      </div>
      {spec.footerHints ? (
        <div className="oo-action-list__footer">
          ↑↓ navigate · ↵ select{onBack ? ' · ← back' : ''} · ⎋ close
        </div>
      ) : null}
    </div>
  );
}
