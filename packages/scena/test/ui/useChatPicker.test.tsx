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

function ButtonComposer({ start }: { start: string }) {
  const [input, setInput] = useState(start);
  const picker = useChatPicker({ input, setInput, caretIndex: input.length, mentionProvider: () => [] });
  shown = { visible: picker.menuVisible, text: input };
  return (
    <>
      <textarea aria-label="message" value={input} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => picker.handleMenuKeyDown(event)} />
      <button type="button" onClick={() => picker.openCommand('demo.approvals')}>Approvals</button>
      {picker.pickerNode}
    </>
  );
}

function buttonComposer(start: string) {
  const scena = createScena();
  scena.commands.register({
    id: 'demo.approvals',
    title: 'Approvals',
    shortcut: '/approvals',
    slots: ['chat:input/'],
    run: (ctx) => {
      ctx.host?.pushList({ title: 'Approvals', sentinel: '/approvals', items: [{ title: 'Ask', onSelect: (host) => host.closeMenu() }] });
    },
  });
  const view = render(
    <ScenaProvider scena={scena}>
      <ButtonComposer start={start} />
    </ScenaProvider>,
  );
  return view;
}

/**
 * Back from a list a button opened goes back to before the button: the list
 * closes and the input loses the shortcut the button wrote. It used to land on
 * the command list filtered by that shortcut, one row long.
 */
describe('useChatPicker and back from a button', () => {
  it('closes the list and gives back the input', async () => {
    const view = buttonComposer('hello');
    await act(async () => {
      fireEvent.click(view.getByText('Approvals', { selector: 'button[type="button"]:not(.oo-action-list__back)' }));
    });
    expect(shown).toEqual({ visible: true, text: 'hello /approvals' });
    const back = view.container.querySelector('.oo-action-list__back') as HTMLButtonElement;
    expect(back).not.toBeNull();
    await act(async () => {
      fireEvent.click(back);
    });
    expect(shown.text).toBe('hello');
    expect(view.container.querySelector('.oo-action-list')).toBeNull();
  });

  it('pops one frame once the person edited the shortcut', async () => {
    const view = buttonComposer('');
    await act(async () => {
      fireEvent.click(view.getByText('Approvals', { selector: 'button[type="button"]:not(.oo-action-list__back)' }));
    });
    const box = view.getByLabelText('message') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(box, { target: { value: '/approvals a' } });
    });
    const back = view.container.querySelector('.oo-action-list__back') as HTMLButtonElement | null;
    if (back !== null) {
      await act(async () => {
        fireEvent.click(back);
      });
    }
    expect(shown.text).toBe('/approvals a');
  });
});
