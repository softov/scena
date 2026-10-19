// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chip } from '../../src/ui/control/Chip.js';

describe('Chip', () => {
  afterEach(cleanup);

  it('says its state, is pressed only when on, and calls onClick', () => {
    const onClick = vi.fn();
    render(
      <>
        <Chip label="get" state="on" onClick={onClick} />
        <Chip label="put" state="implied" title="covered by bot:write" />
        <Chip label="list" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'get' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'put' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'put' }).dataset.state).toBe('implied');
    expect(screen.getByRole('button', { name: 'list' }).dataset.state).toBe('off');
    fireEvent.click(screen.getByRole('button', { name: 'get' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
