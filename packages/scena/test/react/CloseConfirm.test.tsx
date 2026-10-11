// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { MountContext } from '../../src/react/mount-context.js';
import { CloseConfirm } from '../../src/react/CloseConfirm.js';
import { useCloseGuard } from '../../src/react/hooks/useCloseGuard.js';
import { SpatialLayout } from '../../src/ui/layout/SpatialLayout.js';

// jsdom has <dialog> without its modal methods.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Editor({ dirty }: { dirty: boolean }) {
  useCloseGuard(() => (dirty ? 'The changes are not saved.' : null));
  return <textarea aria-label="text" />;
}

function setup(dirty: boolean) {
  const scena = createScena();
  scena.surfaces.open({ surface: 'main', key: 'doc', resource: { component: 'Doc' }, props: { title: 'notes.md' } });
  const view = render(
    <ScenaProvider scena={scena}>
      <MountContext.Provider value="doc">
        <Editor dirty={dirty} />
      </MountContext.Provider>
      <CloseConfirm />
    </ScenaProvider>,
  );
  const open = () => scena.surfaces.listAt('main').map((m) => m.key);
  return { scena, view, open };
}

/**
 * The close a person starts asks first when the mount has pending work, in
 * scena's own dialog.
 */
describe('CloseConfirm and useCloseGuard', () => {
  it('closes a clean mount without a dialog', () => {
    const { scena, open } = setup(false);
    act(() => scena.surfaces.requestClose('doc'));
    expect(open()).toEqual([]);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks for a dirty mount, and closes on Close', () => {
    const { scena, open } = setup(true);
    act(() => scena.surfaces.requestClose('doc'));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('Close notes.md?');
    expect(dialog.textContent).toContain('The changes are not saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(open()).toEqual([]);
  });

  it('keeps the mount on Keep open and on Esc', () => {
    const { scena, open } = setup(true);
    act(() => scena.surfaces.requestClose('doc'));
    fireEvent.click(screen.getByRole('button', { name: 'Keep open' }));
    expect(open()).toEqual(['doc']);
    expect(scena.surfaces.closeAsked()).toBeNull();

    act(() => scena.surfaces.requestClose('doc'));
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }));
    expect(open()).toEqual(['doc']);
  });

  it('stops guarding when the component unmounts', () => {
    const { scena, view, open } = setup(true);
    view.unmount();
    scena.surfaces.requestClose('doc');
    expect(open()).toEqual([]);
  });
});

describe('Esc in the spatial layout', () => {
  function spatial(onClose: (key: string) => void) {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    const scena = createScena();
    const mounts = [{ key: 'a', surface: 'main', component: { component: 'A' }, policy: {}, openedAt: 1 }];
    return render(
      <ScenaProvider scena={scena}>
        <SpatialLayout
          surface="main"
          mounts={mounts as never}
          state={{ visible: true, spatial: { selectedKey: 'a' } } as never}
          setState={() => {}}
          renderMount={() => <input aria-label="field" />}
          onActivate={() => {}}
          onClose={onClose}
          onReorder={() => {}}
        />
        <button type="button">elsewhere</button>
      </ScenaProvider>,
    );
  }

  it('closes the selected card when the focus is on the page', () => {
    const onClose = vi.fn();
    spatial(onClose);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('a');
  });

  it('leaves Esc to a field, to a menu that used it, and to the rest of the page', () => {
    const onClose = vi.fn();
    spatial(onClose);
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'Escape' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'elsewhere' }), { key: 'Escape' });
    const used = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    used.preventDefault();
    document.body.dispatchEvent(used);
    expect(onClose).not.toHaveBeenCalled();
  });
});
