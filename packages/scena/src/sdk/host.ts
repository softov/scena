import type { ResourceColor } from './colors.js';

// HostCtx is the per-picker-instance callback bag. The picker host (chat panel,
// context menu, palette overlay) owns the stack + input + caret + dispatch
// wiring; HostCtx exposes only the operations a command (or synthetic action)
// can perform from inside a picker.
//
// Commands invoked outside a picker (keybinding, programmatic) get `ctx.host`
// === undefined and must branch before calling these methods.
export interface HostCtx {
  // Push a nested list onto the picker stack — visual "submenu" effect, back
  // button enabled.
  pushList(spec: ListSpec): void;

  // Replace the current list in place. Same stack level, no back history added.
  // Used when an item refines the current list instead of nesting deeper —
  // e.g. category pick → show that category's items at the same level.
  replaceList(spec: ListSpec): void;

  // Push a custom React component instead of a list spec. The component
  // renders whatever it wants (often its own ActionList internally). Use when
  // a submenu needs significant custom UI that doesn't fit ListSpec.
  openInline(componentId: string, props?: Record<string, unknown>): void;

  // Open a fresh popover anchored to coordinates (used by right-click style
  // sub-popovers that detach from the original menu's body).
  openPopover(
    componentId: string,
    props?: Record<string, unknown>,
    anchor?: { x: number; y: number },
  ): void;

  // Pop one stack level (back button or ←).
  back(): void;

  // Close the entire picker.
  closeMenu(): void;

  // For toggle commands — don't auto-close after run.
  keepOpen(): void;

  // Text-input helpers. No-op when the host has no input (right-click menus).
  insertAtCursor(text: string): void;
  replaceActiveToken(replacement: string): void;

  // The typed query portion after the active token's prefix+sentinel. Empty
  // when no token is active. Read by providers that filter inline.
  query: string;
}

// One item the picker can render. Either a thin reference to a registered
// command (title/icon/color pulled from the registry) or a synthetic action
// with its own closure (for @, mentions, dynamic data that shouldn't enter
// the command registry).
export type PickerAction =
  | { commandId: string; args?: Record<string, unknown> }
  | {
      title: string;
      description?: string;
      icon?: string;
      color?: ResourceColor;
      // Chat typed-prefix shown on the left of the row (e.g. '/agent').
      shortcut?: string;
      // Keyboard binding shown on the right of the row (e.g. 'ctrl+k z').
      keys?: string;
      group?: string;
      active?: boolean;
      disabled?: boolean;
      onSelect(host: HostCtx): void | Promise<void>;
    };

export type ListLayout = 'list' | 'info-list' | 'header-list';

// One frame of the picker stack. Three input modes (items / provider / query)
// are mutually exclusive in practice but not enforced at the type level — the
// picker resolves them in order: items first, then provider, then query.
export interface ListSpec {
  // Mode A — static inline items.
  items?: PickerAction[];

  // Rows prepended before the resolved mode rows (items/provider/query). Lets a
  // host inject registry-derived actions inline — e.g. the file context menu
  // adding "Open with <viewer>" rows from findOpeners() ahead of the slot
  // commands — without nesting or minting per-viewer commands. Grouped by
  // their own category/group like any other row.
  extraItems?: PickerAction[];

  // Mode B — dynamic / async items. Returning a Promise shows a loading row
  // until resolved. Re-invoked when the picker's query changes (debounced).
  provider?: (host: HostCtx) => PickerAction[] | Promise<PickerAction[]>;

  // Mode C — pull from scena.commands by slot tag(s). Pass an array to
  // union items from multiple slot families in one menu (e.g. a tab
  // right-click that mixes `tab:context` actions with `resource:context`
  // actions when the tab is a resource). Filtered by `q` against
  // shortcut/keywords/title; sorted by category + a stable order.
  // Results are deduplicated by command id when multiple slots match.
  query?: { slot: string | string[]; q?: string };

  // Visual layout.
  layout?: ListLayout;

  // Rich rows — stack title over description (instead of description right-
  // aligned on the same line) and put the active ✓ at the far right. Chat
  // pickers use this so routing/model/mode rows read like the web composer.
  rich?: boolean;

  // For layout='header-list' — block rendered above the items (e.g. room card).
  // Returns ReactNode-shaped value; renderer adapts.
  header?: (host: HostCtx) => unknown;

  // For layout='info-list' — block rendered to the right of the items, keyed
  // off the currently-focused row (e.g. flow card).
  detail?: (host: HostCtx, focused?: PickerAction) => unknown;

  // Arbitrary block above the items (e.g. inline <input> for pattern 9 —
  // "Send raw text" with suggestion list below).
  customHeader?: (host: HostCtx) => unknown;

  // Show the kbd hints strip (↑↓ navigate · ↵ select · ← back · ⎋ close).
  footerHints?: boolean;

  // Optional category-order override for grouping. Defaults to insertion order.
  groupOrder?: string[];

  // Optional title shown above the items (for back button label when this
  // frame is mid-stack).
  title?: string;

  // Sentinel that keeps this pushed frame open. When a command opens a
  // submenu via host.pushList({ sentinel: '/model', ... }), the picker keeps
  // the frame only while the active token still starts with the sentinel —
  // editing the token to no longer match (e.g. '/model' → '/rout') collapses
  // back to the root command list. While the frame is open, the picker also
  // strips the sentinel (plus a leading '=' or space) from the token and
  // exposes the remainder as host.query, so providers can filter inline
  // (e.g. typing '/model=gemi' filters the model list by 'gemi'). Include the
  // prefix, matching Command.shortcut form ('/model', not 'model'). Pass an
  // array when a command has aliases (e.g. ['/agent', '/persona']) — the frame
  // stays open while the token matches any of them.
  sentinel?: string | string[];
}
