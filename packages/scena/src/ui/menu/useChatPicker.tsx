import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PickerAction, HostCtx, ListSpec } from '../../types/host.js';
import type { BindingPath } from '../../types/component-graph.js';
import { useScena } from '../../react/ScenaProvider.js';
import {
  canonicalShortcut,
  commitToken,
  getActiveToken,
  insertShortcut,
  stripSentinel,
  tokenMatchesSentinel,
} from './token.js';
import { ActionList, type ActionListController } from './ActionList.js';

// Per-instance host hook for chat-style inputs. Owns:
//   - Token detection on each keystroke
//   - Picker stack (push/replace/back/openInline)
//   - HostCtx factory bound to this instance
//   - Composer button → typing convergence via openCommand(id)
//
// Each chat panel owns one of these. Ten panels = ten hooks, no shared state.

// Reference-stable default so consumers that don't pass `prefixes` don't
// invalidate every memo that depends on it (tokenInfo → host → ActionList
// effect → setResolved → re-render). The destructure-default was a fresh
// array every call and caused "Maximum update depth exceeded".
const DEFAULT_PREFIXES: ReadonlyArray<string> = ['/', '@'];

export interface UseChatPickerParams {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  caretIndex?: number | null;
  // Mount root for relative-path writes (e.g. '$/chats/7').
  panelDataContext?: BindingPath;
  // Slot tag for slash-style commands. Defaults to 'chat:input/'.
  slashSlot?: string;
  // Slot tag for '@'-style commands. Defaults to 'chat:input@'. Most apps
  // skip this and use `mentionProvider` instead.
  mentionSlot?: string;
  // Provider that returns rows for '@' tokens. When set, '@' triggers a
  // provider-mode picker; when unset, '@' tokens are ignored.
  mentionProvider?: (host: HostCtx) => PickerAction[] | Promise<PickerAction[]>;
  // Prefix characters the picker reacts to. Defaults to ['/', '@'].
  prefixes?: string[];
  // Notified after any programmatic edit to the input (token autocomplete,
  // mention insertion, menu close) with the caret position the host should
  // move to + focus. Without this the textarea caret stays stale and a freshly
  // inserted reference keeps the picker open instead of dismissing it.
  onCaretChange?: (caret: number) => void;
}

export interface UseChatPickerResult {
  menuVisible: boolean;
  // Sentinel of the submenu currently on top of the picker stack (e.g.
  // ['/mode','/chatmode'] while the /mode submenu is open), or undefined at the
  // root command list / when closed. Lets a host reflect *what* is open — e.g.
  // a toolbar chevron that points up only while its own submenu is showing.
  activeSentinel: string | string[] | undefined;
  pickerNode: ReactNode | null;
  handleMenuKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): boolean;
  // Opens the command's picker and returns the caret position after the
  // inserted shortcut (null when the command has no shortcut). The host should
  // sync its caret state to this and focus the input.
  openCommand(commandId: string): number | null;
  closeMenu(): void;
}

type Frame = { spec: ListSpec } | { component: ReactNode };

export function useChatPicker(params: UseChatPickerParams): UseChatPickerResult {
  const {
    input,
    setInput,
    caretIndex,
    panelDataContext,
    slashSlot = 'chat:input/',
    mentionSlot = 'chat:input@',
    mentionProvider,
    prefixes = DEFAULT_PREFIXES as string[],
    onCaretChange,
  } = params;

  const scena = useScena();

  // Picker stack — top is what renders. Reset by token changes.
  const [stack, setStack] = useState<Frame[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  // Imperative handle on the visible ActionList. handleMenuKeyDown routes
  // navigation keys through it so only the focused panel's picker reacts —
  // ActionList's document-level listener is disabled here via manageKeys.
  const actionListRef = useRef<ActionListController>(null);

  // Token detection on each render.
  const tokenInfo = useMemo(
    () => getActiveToken(input, prefixes, caretIndex),
    [input, prefixes, caretIndex],
  );
  const menuVisible = tokenInfo !== null;

  // Root frame for the current token's prefix.
  const rootSpecFor = useCallback(
    (query: string): ListSpec =>
      tokenInfo?.prefix === '@'
        ? mentionProvider
          ? { provider: mentionProvider, footerHints: true, rich: true }
          : { query: { slot: mentionSlot, q: query }, footerHints: true, rich: true }
        : { query: { slot: slashSlot, q: query }, footerHints: true, rich: true },
    [tokenInfo?.prefix, mentionProvider, mentionSlot, slashSlot],
  );

  // When the active token changes, decide what the root frame should be.
  // - '/' token → query slot (slashSlot)
  // - '@' token → mentionProvider (if any), else mention slot
  // - no token → empty stack
  useEffect(() => {
    if (!tokenInfo) {
      if (stackRef.current.length > 0) setStack([]);
      return;
    }
    const top = stackRef.current[stackRef.current.length - 1];
    const isRoot = stackRef.current.length <= 1;
    if (isRoot) {
      setStack([{ spec: rootSpecFor(tokenInfo.query) }]);
      return;
    }
    // A submenu (pushed by a command) is open. If it declared a sentinel and
    // the token no longer starts with it (user edited '/model' → '/rout'),
    // collapse all the way back to the root command list.
    const topSpec = top && 'spec' in top ? top.spec : undefined;
    if (topSpec?.sentinel && !tokenMatchesSentinel(tokenInfo.token, topSpec.sentinel)) {
      setStack([{ spec: rootSpecFor(tokenInfo.query) }]);
      return;
    }
    if (topSpec?.query) {
      // Re-resolve query-mode submenu against the new q.
      setStack((cur) => {
        const next = cur.slice(0, -1);
        next.push({ spec: { ...topSpec, query: { ...topSpec.query!, q: tokenInfo.query } } });
        return next;
      });
    }
    // provider/items frames: left as-is; their provider re-runs on its own
    // when host.query (the post-sentinel filter text) changes.
  }, [tokenInfo, rootSpecFor]);

  // Sentinel of the visible submenu (if it declared one) and the post-sentinel
  // filter text. For '/model=gemi' with sentinel '/model', filterQuery='gemi'
  // — providers read host.query to filter inline.
  const activeSentinel = useMemo(() => {
    const t = stack[stack.length - 1];
    return t && 'spec' in t ? t.spec.sentinel : undefined;
  }, [stack]);
  const filterQuery = useMemo(
    () => stripSentinel(tokenInfo?.query ?? '', activeSentinel),
    [tokenInfo, activeSentinel],
  );

  // Host callbacks — bound to this hook's state. Re-created when setInput
  // changes so insertAtCursor / replaceActiveToken always see the latest
  // dispatcher.
  const host = useMemo<HostCtx>(() => ({
    pushList: (s) => setStack((cur) => [...cur, { spec: s }]),
    replaceList: (s) => setStack((cur) => {
      const next = cur.slice(0, -1);
      next.push({ spec: s });
      return next;
    }),
    openInline: (componentId) => setStack((cur) => [
      ...cur,
      { component: <MissingInline name={componentId} /> },
    ]),
    openPopover: () => undefined, // chat-style hosts don't open detached popovers from within
    back: () => setStack((cur) => (cur.length > 1 ? cur.slice(0, -1) : cur)),
    closeMenu: () => {
      setStack([]);
      const r = commitToken(input, caretIndex, '', prefixes);
      setInput(r.next);
      onCaretChange?.(r.caret);
    },
    keepOpen: () => undefined,
    insertAtCursor: (text) => {
      const r = commitToken(input, caretIndex, text, prefixes);
      setInput(r.next);
      onCaretChange?.(r.caret);
    },
    replaceActiveToken: (replacement) => {
      const r = commitToken(input, caretIndex, replacement, prefixes);
      setInput(r.next);
      onCaretChange?.(r.caret);
    },
    query: filterQuery,
  }), [input, caretIndex, prefixes, setInput, filterQuery, onCaretChange]);

  const top = stack[stack.length - 1];
  // Hoisted out of the conditional so `onBack` keeps a stable identity. Inline,
  // it minted a new arrow every render and defeated the useCallback below that
  // depends on it.
  const popStack = useCallback(() => setStack((cur) => cur.slice(0, -1)), []);
  const onBack = stack.length > 1 ? popStack : undefined;

  // Keyboard hook the host wires to its textarea onKeyDown. Returns true when
  // handled so the host knows whether to call its own default behavior.
  // Navigation keys (ArrowDown/Up/Enter/Tab) are routed through the visible
  // ActionList's imperative controller — this scopes them to THIS panel's
  // picker even when another chat panel also has a picker open.
  const handleMenuKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): boolean => {
      if (!menuVisible) return false;
      if (e.key === 'Escape') {
        e.preventDefault();
        host.closeMenu();
        return true;
      }
      if (e.key === 'ArrowLeft' && onBack) {
        const target = e.target as HTMLTextAreaElement | HTMLInputElement;
        if (target.selectionStart === target.selectionEnd) {
          if (tokenInfo && target.selectionStart === tokenInfo.start + tokenInfo.prefix.length) {
            e.preventDefault();
            onBack();
            return true;
          }
        }
      }
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === 'Tab'
      ) {
        return actionListRef.current?.handleKey(e) ?? false;
      }
      return false;
    },
    [menuVisible, host, onBack, tokenInfo],
  );

  // openCommand: composer buttons converge with typing. Rewrites the input
  // to the command's canonical shortcut, then triggers picker via the token
  // detection cycle.
  // Opens a command's picker from a composer button. Writes the command's
  // shortcut into the input (replacing the active token, or appending one when
  // the input has none — the button click should work on an empty composer),
  // seeds the root frame, runs the command, and returns the caret position
  // just after the inserted token so the host can sync its caret state + focus
  // the input (otherwise keyboard nav is dead and token detection misfires).
  const openCommand = useCallback((commandId: string): number | null => {
    const cmd = scena.commands.get(commandId);
    if (!cmd) return null;
    const sc = canonicalShortcut(cmd.shortcut);
    let newCaret: number | null = null;
    if (sc) {
      const { next, caret } = insertShortcut(input, caretIndex, sc, prefixes);
      newCaret = caret;
      setInput(next);
      // Seed the root command frame first so a submenu the command pushes lands
      // at depth 2 — the token effect only replaces the root frame at depth ≤ 1
      // and would otherwise clobber a freshly-pushed submenu.
      setStack([{ spec: { query: { slot: slashSlot, q: sc.replace(/^[/@]/, '') }, footerHints: true, rich: true } }]);
    }
    // Immediate dispatch so the command's `run` opens its submenu through host
    // (or toggles + closes for toggle commands).
    void scena.commands.execute(commandId, undefined, {
      source: 'menu',
      dataContext: panelDataContext,
      host,
    });
    return newCaret;
  }, [scena, panelDataContext, input, caretIndex, prefixes, host, setInput, slashSlot]);

  const closeMenu = useCallback(() => host.closeMenu(), [host]);

  const pickerNode = top
    ? 'component' in top
      ? (top.component as ReactNode)
      : (
          <ActionList
            ref={actionListRef}
            spec={top.spec}
            hostCtx={host}
            onBack={onBack}
            dataContext={panelDataContext}
            manageKeys={false}
          />
        )
    : null;

  return {
    menuVisible,
    activeSentinel,
    pickerNode,
    handleMenuKeyDown,
    openCommand,
    closeMenu,
  };
}

// True when `sentinel` (a frame's single/alias sentinel) contains `target`.
// Helper for hosts checking "is my submenu the one currently open?".
export function sentinelHas(sentinel: string | string[] | undefined, target: string): boolean {
  if (!sentinel) return false;
  return Array.isArray(sentinel) ? sentinel.includes(target) : sentinel === target;
}

function MissingInline({ name }: { name: string }) {
  return <div style={{ padding: 12 }}>[component: {name}]</div>;
}

