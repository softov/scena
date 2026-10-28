// Copy through a selected, hidden text box: the way left to a page served over
// plain http from another machine, where the browser has no
// `navigator.clipboard`.
function copyBySelection(text: string): boolean {
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    box.remove();
  }
}

// Put `text` on the clipboard; resolves whether it got there. Call it from the
// click or key handler: the browser copies only inside a user gesture.
export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard === undefined) return Promise.resolve(copyBySelection(text));
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => copyBySelection(text),
  );
}
