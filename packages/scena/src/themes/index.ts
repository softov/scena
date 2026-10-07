import { registerTheme, type ThemeDefinition } from '../styles/index.js';
import { coderTheme } from './coder.js';
import { forestTheme } from './forest.js';
import { paperTheme } from './paper.js';
import { solarizedTheme } from './solarized.js';
import { sunsetTheme } from './sunset.js';
import { vsModernTheme } from './vs-modern.js';

export { coderTheme, forestTheme, paperTheme, solarizedTheme, sunsetTheme, vsModernTheme };
export { paletteTokens, type Palette } from './palette.js';

/** The themes scena ships beside its default, in the order a picker lists them. */
export const builtinThemes: readonly ThemeDefinition[] = [vsModernTheme, solarizedTheme, paperTheme, coderTheme, sunsetTheme, forestTheme];

/** Registers every built-in theme. Call it before the first `applyTheme()`, so a stored choice resolves. */
export function registerBuiltinThemes(): void {
  for (const theme of builtinThemes) registerTheme(theme);
}
