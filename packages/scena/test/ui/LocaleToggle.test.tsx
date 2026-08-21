// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { registerLocale, registerMessages, setLocale, getLocale, clearMessages } from '../../src/core/i18n/registry.js';
import { LocaleToggle } from '../../src/ui/control/LocaleToggle.js';

beforeEach(() => clearMessages());

describe('LocaleToggle', () => {
  it('renders locales as text, accents the active one, switches on click', () => {
    registerLocale({ locale: 'en', emoji: '🇺🇸', name: 'English' });
    registerMessages('pt', { x: 'y' }, { emoji: '🇧🇷', name: 'Português' });
    setLocale('en');

    render(<LocaleToggle locales={['en', 'pt']} />);
    const en = screen.getByText('EN');
    const pt = screen.getByText('PT');
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(pt.getAttribute('aria-pressed')).toBe('false');
    expect(en.className).toContain('oo-locale-toggle__item--active');

    fireEvent.click(pt);
    expect(getLocale()).toBe('pt');
  });

  it('emoji display shows the flag', () => {
    registerLocale({ locale: 'en', emoji: '🇺🇸', name: 'English' });
    render(<LocaleToggle display="emoji" locales={['en']} />);
    expect(screen.getByText('🇺🇸')).toBeTruthy();
  });
});
