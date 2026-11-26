/** Where the panel docks. */
export type PanelPosition = 'bottom' | 'right';

/** The panel's colours: following the system setting, or always light or dark. */
export type Theme = 'system' | 'light' | 'dark';

export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/** What the floating panel remembers across reloads. */
export interface PanelState {
  isOpen: boolean;
  /** Panel height when docked at the bottom, in pixels. */
  height: number;
  /** Panel width when docked on the right, in pixels. */
  width: number;
}

export const STORAGE_KEY = 'swr-devtools-react';
/** Kept apart from the floating panel's state, because the inline panel uses it too. */
export const THEME_STORAGE_KEY = 'swr-devtools-react:theme';

export const DEFAULT_HEIGHT = 320;
export const DEFAULT_WIDTH = 480;

/**
 * Reads the saved state. Anything missing, invalid, or unreadable (storage
 * disabled, private mode, a sandboxed iframe) falls back to the defaults.
 */
export function loadPanelState(fallback: PanelState): PanelState {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;

  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof saved !== 'object' || saved === null) return fallback;

  const isOpen: unknown = Reflect.get(saved, 'isOpen');
  const height: unknown = Reflect.get(saved, 'height');
  const width: unknown = Reflect.get(saved, 'width');
  return {
    isOpen: typeof isOpen === 'boolean' ? isOpen : fallback.isOpen,
    height: isSize(height) ? height : fallback.height,
    width: isSize(width) ? width : fallback.width
  };
}

/** Saves the state. A failed write (quota, storage disabled) is ignored. */
export function savePanelState(state: PanelState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The panel still works; it just won't remember this across reloads.
  }
}

/** Reads the theme the user chose in the panel, or `system` if there's none. */
export function loadTheme(): Theme {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return 'system';
  }
  return THEMES.find((theme) => theme === raw) ?? 'system';
}

/** Saves the user's theme. A failed write is ignored, like `savePanelState`. */
export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The panel still works; it just won't remember this across reloads.
  }
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
