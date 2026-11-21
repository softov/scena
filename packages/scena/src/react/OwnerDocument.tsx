import { createContext, useContext, type ReactNode } from 'react';

// The document a subtree is drawn into.
//
// scena can draw a surface into a second browser window from the main one,
// through a portal (see SurfaceWindows). React context and events flow
// through the portal, but the global `document` and `window` stay the main
// window's. A component that listens on the global `document`, measures the
// global `window`, or portals into the global `document.body` would act on
// the wrong window. It reads this instead.
//
// Null outside such a subtree: the global document is the right one.
const OwnerDocumentContext = createContext<Document | null>(null);

export function OwnerDocumentProvider({ document, children }: { document: Document; children: ReactNode }) {
  return <OwnerDocumentContext.Provider value={document}>{children}</OwnerDocumentContext.Provider>;
}

export interface OwnerDocument {
  document: Document;
  window: Window & typeof globalThis;
}

// The document and window this component is drawn into: a second window's
// inside one, the global ones everywhere else.
export function useOwnerDocument(): OwnerDocument {
  const owned = useContext(OwnerDocumentContext);
  const doc = owned ?? document;
  const win = (doc.defaultView ?? window) as Window & typeof globalThis;
  return { document: doc, window: win };
}
