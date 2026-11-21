import type { SurfaceName } from '../sdk/mount-surface.js';
import { useI18n } from './hooks/useI18n.js';

export interface BlockedWindowsProps {
  blocked: SurfaceName[];
  // Opens them. Called from the button's click, which the browser allows.
  onOpen: () => void;
  // Sends their tabs to `main` and forgets the windows.
  onDismiss: () => void;
}

/**
 * The notice for windows the browser would not open, as after a reload with
 * pop-ups blocked. A browser opens a window from a click, so the button opens
 * them; VS Code asks the same way. Not modal: the page works behind it.
 *
 * `SurfaceWindows` draws it. Styled by `.oo-blocked-windows` in surface.css.
 */
export function BlockedWindows({ blocked, onOpen, onDismiss }: BlockedWindowsProps) {
  const { t } = useI18n('windows');
  const count = blocked.length;
  return (
    <div className="oo-blocked-windows" role="alert">
      <p className="oo-blocked-windows__text">
        {count === 1
          ? t('blockedOne', 'The browser blocked a window this page had open.')
          : t('blockedMany', { count: String(count), fallback: 'The browser blocked {count} windows this page had open.' })}
      </p>
      <div className="oo-blocked-windows__actions">
        <button type="button" onClick={onDismiss}>
          {t('moveToMain', 'Move tabs to the main area')}
        </button>
        <button type="button" data-variant="primary" autoFocus onClick={onOpen}>
          {count === 1 ? t('openOne', 'Open window') : t('openMany', 'Open windows')}
        </button>
      </div>
    </div>
  );
}
