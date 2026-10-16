// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { ActionList } from '../../src/ui/menu/ActionList.js';
import { clearMessages, registerMessages, setLocale } from '../../src/core/i18n/registry.js';
import type { HostCtx, ListSpec } from '../../src/sdk/host.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = (path: string): string => readFileSync(resolve(here, path), 'utf8');

const host: HostCtx = {
  pushList: () => undefined,
  replaceList: () => undefined,
  openInline: () => undefined,
  openPopover: () => undefined,
  back: () => undefined,
  closeMenu: () => undefined,
  keepOpen: () => undefined,
  insertAtCursor: () => undefined,
  replaceActiveToken: () => undefined,
  query: '',
};

const spec: ListSpec = {
  footerHints: true,
  items: [
    { title: 'Tabs', active: true, onSelect: () => undefined },
    { title: 'Split', onSelect: () => undefined },
  ],
};

function mount(onBack?: () => void) {
  return render(
    <ScenaProvider scena={createScena()}>
      <ActionList spec={spec} hostCtx={host} manageKeys={false} {...(onBack ? { onBack } : {})} />
    </ScenaProvider>,
  );
}

beforeEach(() => {
  // jsdom has no layout; ActionList scrolls the focused row into view.
  Element.prototype.scrollIntoView = () => undefined;
  clearMessages();
  setLocale('en');
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

describe('ActionList footer hints', () => {
  it('reads in English with no messages registered', () => {
    const { container } = mount(() => undefined);
    expect(container.querySelector('.oo-action-list__footer')?.textContent).toBe('↑↓ navigate · ↵ select · ← back · ⎋ close');
  });

  it('follows the locale through the picker/* keys', () => {
    registerMessages('pt-BR', { picker: { navigate: 'navegar', select: 'escolher', back: 'voltar', close: 'fechar' } });
    const { container } = mount();
    act(() => setLocale('pt-BR'));
    expect(container.querySelector('.oo-action-list__footer')?.textContent).toBe('↑↓ navegar · ↵ escolher · ⎋ fechar');
  });
});

describe('ActionList ticked rows', () => {
  it('a ticked row that is not the focused one has no pressed background', () => {
    const style = document.createElement('style');
    style.textContent = `${css('../../src/styles/base.css')}\n${css('../../src/ui/menu/ActionList.css')}`;
    document.head.appendChild(style);
    // Focus moves off the first row, so the ticked row is neither hovered nor selected.
    const { container } = mount();
    const rows = container.querySelectorAll<HTMLElement>('.oo-action-list__row');
    fireEvent.mouseEnter(rows[1]!);
    expect(rows[0]!.dataset.active).toBe('true');
    expect(rows[0]!.dataset.selected).toBeUndefined();
    // jsdom does not substitute custom properties, so base.css's pressed
    // background reads back as `var(--button-background-active)`; the reset
    // in ActionList.css makes it `none`.
    expect(getComputedStyle(rows[0]!).getPropertyValue('background')).toBe('none');
  });
});

describe('ActionList group labels', () => {
  const grouped: ListSpec = {
    items: [
      { title: 'Zen', group: 'View', onSelect: () => undefined },
      { title: 'Log', group: 'Panel', onSelect: () => undefined },
    ],
  };

  it('a group label is translated through groups/<label>, and shown as it is without a message', () => {
    registerMessages('pt-BR', { groups: { View: 'Exibir' } });
    setLocale('pt-BR');
    const { container } = render(
      <ScenaProvider scena={createScena()}>
        <ActionList spec={grouped} hostCtx={host} manageKeys={false} />
      </ScenaProvider>,
    );
    const labels = Array.from(container.querySelectorAll('.oo-action-list__group-label'), (el) => el.textContent);
    expect(labels).toEqual(['Exibir', 'Panel']);
  });
});

describe('ActionList closes after a choice unless the choice decides', () => {
  function pick(items: ListSpec['items'] | ListSpec, setup?: (scena: ReturnType<typeof createScena>) => void) {
    const scena = createScena();
    setup?.(scena);
    const closeMenu = vi.fn();
    const replaceActiveToken = vi.fn();
    const view = render(
      <ScenaProvider scena={scena}>
        <ActionList spec={Array.isArray(items) ? { items } : items} hostCtx={{ ...host, closeMenu, replaceActiveToken }} manageKeys={false} />
      </ScenaProvider>,
    );
    return { view, closeMenu, replaceActiveToken };
  }
  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  it('a choice that says nothing closes the menu once it is done', async () => {
    const ran = vi.fn();
    const { view, closeMenu } = pick([{ title: 'Toggle', onSelect: ran }]);
    fireEvent.click(view.getByText('Toggle'));
    await settle();
    expect(ran).toHaveBeenCalled();
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it('a command run from the menu that knows nothing of menus closes it too', async () => {
    const run = vi.fn();
    const { view, closeMenu } = pick([{ commandId: 'x.toggle' }], (scena) => {
      scena.commands.register({ id: 'x.toggle', title: 'Toggle sidebar', run });
    });
    fireEvent.click(await view.findByText('Toggle sidebar'));
    await settle();
    expect(run).toHaveBeenCalled();
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it('keepOpen, a sub-list, a token replaced or the row closing itself leave it to the row', async () => {
    const { view, closeMenu } = pick([
      { title: 'Stay', onSelect: (h) => h.keepOpen() },
      { title: 'Deeper', onSelect: (h) => h.pushList({ items: [] }) },
      { title: 'Folder', onSelect: (h) => h.replaceActiveToken('@src/') },
      { title: 'Done', onSelect: (h) => h.closeMenu() },
    ]);
    for (const title of ['Stay', 'Deeper', 'Folder']) {
      fireEvent.click(view.getByText(title));
      await settle();
    }
    expect(closeMenu).not.toHaveBeenCalled();
    fireEvent.click(view.getByText('Done'));
    await settle();
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });

  it("completing a command's shortcut is ActionList's own step, not the command's decision", async () => {
    const { view, closeMenu, replaceActiveToken } = pick({ query: { slot: 'x:chat' } }, (scena) => {
      scena.commands.register({ id: 'x.clear', title: 'Clear', shortcut: '/clear', slots: ['x:chat'], run: () => undefined });
    });
    fireEvent.click(await view.findByText('Clear'));
    await settle();
    expect(replaceActiveToken).toHaveBeenCalledWith('/clear');
    expect(closeMenu).toHaveBeenCalledTimes(1);
  });
});

