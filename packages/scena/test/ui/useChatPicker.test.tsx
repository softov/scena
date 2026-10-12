// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { useChatPicker } from '../../src/ui/menu/useChatPicker.js';

afterEach(cleanup);

let shown = { visible: false, text: '' };

function Composer({ start }: { start: string }) {
  const [input, setInput] = useState(start);
  const picker = useChatPicker({ input, setInput, caretIndex: input.length, mentionProvider: () => [] });
  shown = { visible: picker.menuVisible, text: input };
  return (
    <textarea
      aria-label="message"
      value={input}
      onChange={(event) => setInput(event.currentTarget.value)}
      onKeyDown={(event) => picker.handleMenuKeyDown(event)}
    />
  );
}

function composer(start: string) {
  const view = render(
    <ScenaProvider scena={createScena()}>
      <Composer start={start} />
    </ScenaProvider>,
  );
  return view.getByLabelText('message') as HTMLTextAreaElement;
}

/**
 * Esc closes the suggestion list and leaves what was typed, as VS Code's
 * suggest widget does. It used to clear the token: "see @pack" became "see".
 */
describe('useChatPicker and Esc', () => {
  it('closes the list and keeps the typed token', () => {
    const box = composer('see @pack');
    expect(shown.visible).toBe(true);
    act(() => {
      fireEvent.keyDown(box, { key: 'Escape' });
    });
    expect(shown).toEqual({ visible: false, text: 'see @pack' });
  });

  it('opens the list again once the token changes', () => {
    const box = composer('see @pack');
    act(() => {
      fireEvent.keyDown(box, { key: 'Escape' });
    });
    act(() => {
      fireEvent.change(box, { target: { value: 'see @packa' } });
    });
    expect(shown).toEqual({ visible: true, text: 'see @packa' });
  });
});
