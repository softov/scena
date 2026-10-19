// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs } from '../../src/ui/navigation/Tabs.js';

describe('Tabs', () => {
  afterEach(cleanup);

  it('opens on defaultValue and tells onChange the key of the tab chosen', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[{ key: 'host', title: 'Host', child: 'host panel' }, { key: 'ui', title: 'Interface', child: 'ui panel' }]}
        defaultValue="ui"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tabpanel').textContent).toBe('ui panel');
    fireEvent.click(screen.getByRole('tab', { name: 'Host' }));
    expect(onChange).toHaveBeenCalledWith('host');
    expect(screen.getByRole('tabpanel').textContent).toBe('host panel');
  });
});
