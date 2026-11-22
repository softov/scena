// What a drag of a surface's edge puts over the page while it lasts.
//
// The drag must not select the text it crosses, and the cursor must stay the
// resize cursor wherever the pointer goes. A class on `<html>` with rules for
// every element did both, but adding or removing it restyled the whole page:
// about 210 ms at each end of a drag on ahpw's large pages. A transparent
// element over the page does both with one element to style: the pointer is
// over it, so its cursor shows and nothing under it is selected. The pointer is
// captured by the grip, so the drag's events still go there.
//
// `oo-resizing` stays on `<html>` for rules that name what they change, as the
// table rows of Listable.css do; such a rule restyles only what it names.
export function shieldDrag(doc: Document, cursor: string): () => void {
  const shield = doc.createElement('div');
  shield.className = 'oo-resize-shield';
  shield.style.cssText = `position:fixed;inset:0;z-index:2147483647;cursor:${cursor};user-select:none;`;
  doc.body.appendChild(shield);
  doc.documentElement.classList.add('oo-resizing');
  return () => {
    shield.remove();
    doc.documentElement.classList.remove('oo-resizing');
  };
}
