import type { Disposable } from '../sdk/disposable.js';

// Gives a second window the main window's look, and keeps it.
//
// A window that SurfaceWindows opens is `about:blank`: it has no style sheet
// and no theme. This copies into it every `<link rel="stylesheet">` and
// `<style>` of the main `<head>`, and the attributes of `<html>` and `<body>`
// (the theme's `data-theme`, the `--oo-*` variables the layout writes as
// inline style, `lang`, `dir`, classes). Two MutationObservers follow what
// changes after: a style sheet added or removed (a lazy chunk's CSS, a theme
// link), a `<style>` whose text changes (Vite's hot reload), an attribute
// written (a theme switch).
//
// Constructed sheets (`adoptedStyleSheets`) are copied once, at open: a sheet
// belongs to one document, so each is rebuilt from its rules. A rule a script
// inserts later through `sheet.insertRule` is not seen; VS Code has the same
// gap.

const SHEET_SELECTOR = 'link[rel~="stylesheet"], style';

function isSheet(node: Node): node is HTMLLinkElement | HTMLStyleElement {
  if (node.nodeType !== 1) return false;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  return tag === 'style' || (tag === 'link' && (el.getAttribute('rel') ?? '').split(/\s+/).includes('stylesheet'));
}

function copyAttributes(from: Element, to: Element): void {
  for (const attr of Array.from(to.attributes)) {
    if (!from.hasAttribute(attr.name)) to.removeAttribute(attr.name);
  }
  for (const attr of Array.from(from.attributes)) {
    if (to.getAttribute(attr.name) !== attr.value) to.setAttribute(attr.name, attr.value);
  }
}

function copyAdopted(from: Document, to: Document): void {
  const sheets = (from as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
  const view = to.defaultView as (Window & typeof globalThis) | null;
  if (!sheets || sheets.length === 0 || !view || typeof view.CSSStyleSheet !== 'function') return;
  try {
    const copies = sheets.map((sheet) => {
      const copy = new view.CSSStyleSheet();
      copy.replaceSync(Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n'));
      return copy;
    });
    (to as Document & { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = copies;
  } catch {
    // A browser without constructable sheets in a second window: the linked
    // and inline sheets still apply.
  }
}

export function mirrorStyles(from: Document, to: Document): Disposable {
  const clones = new Map<Node, Node>();

  function add(node: HTMLLinkElement | HTMLStyleElement): void {
    if (clones.has(node)) return;
    const clone = to.importNode(node, true);
    clones.set(node, clone);
    to.head.appendChild(clone);
  }
  function remove(node: Node): void {
    const clone = clones.get(node);
    if (!clone) return;
    clone.parentNode?.removeChild(clone);
    clones.delete(node);
  }
  // The `<style>` that holds `node`, when its text changed.
  function owningStyle(node: Node): HTMLStyleElement | null {
    let cur: Node | null = node;
    while (cur && cur !== from.head) {
      if (cur.nodeType === 1 && (cur as Element).tagName.toLowerCase() === 'style') return cur as HTMLStyleElement;
      cur = cur.parentNode;
    }
    return null;
  }

  for (const node of Array.from(from.head.querySelectorAll(SHEET_SELECTOR))) {
    if (isSheet(node)) add(node);
  }
  copyAdopted(from, to);
  copyAttributes(from.documentElement, to.documentElement);
  if (from.body && to.body) copyAttributes(from.body, to.body);

  const View = (from.defaultView ?? globalThis) as typeof globalThis;
  if (typeof View.MutationObserver !== 'function') return { dispose() {} };

  const headObserver = new View.MutationObserver((records) => {
    for (const record of records) {
      const style = owningStyle(record.target);
      // A change inside a `<style>`: its text, by a child or a text node.
      if (style && clones.has(style)) {
        (clones.get(style) as HTMLStyleElement).textContent = style.textContent;
        continue;
      }
      for (const node of Array.from(record.addedNodes)) if (isSheet(node)) add(node);
      for (const node of Array.from(record.removedNodes)) remove(node);
      // A link whose href or rel changed: copy it again.
      if (record.type === 'attributes' && isSheet(record.target)) {
        remove(record.target);
        add(record.target);
      }
    }
  });
  headObserver.observe(from.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'rel', 'media', 'disabled'] });

  const rootObserver = new View.MutationObserver(() => {
    copyAttributes(from.documentElement, to.documentElement);
    if (from.body && to.body) copyAttributes(from.body, to.body);
  });
  rootObserver.observe(from.documentElement, { attributes: true });
  if (from.body) rootObserver.observe(from.body, { attributes: true });

  return {
    dispose() {
      headObserver.disconnect();
      rootObserver.disconnect();
      clones.clear();
    },
  };
}
