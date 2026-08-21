// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { registerMessages, setLocale, clearMessages } from '../../src/core/i18n/registry.js';
import { Translate } from '../../src/react/Translate.js';

beforeEach(() => clearMessages());
afterEach(cleanup);

describe('Translate', () => {
  it('renders a registered key', () => {
    registerMessages('en', { user: { nameLabel: 'Name' } });
    render(<Translate k="user/nameLabel" fallback="X" />);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('uses the inline fallback for a missing key + interpolates flat params', () => {
    render(<Translate k="greet" fallback="Hi {name}" name="Ann" />);
    expect(screen.getByText('Hi Ann')).toBeTruthy();
  });

  it('supports ns and re-renders on locale switch', () => {
    registerMessages('en', { user: { nameLabel: 'Name' } });
    registerMessages('pt', { user: { nameLabel: 'Nome' } });
    render(<Translate ns="user" k="nameLabel" />);
    expect(screen.getByText('Name')).toBeTruthy();
    act(() => setLocale('pt'));
    expect(screen.getByText('Nome')).toBeTruthy();
  });
});
