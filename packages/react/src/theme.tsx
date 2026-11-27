import { useState, type ReactElement, type ReactNode } from 'react';
import { loadTheme, saveTheme, type Theme } from './storage.ts';

export interface ThemeChoice {
  theme: Theme;
  /** Set only when the user picks the theme. A host app's `theme` prop leaves it unset. */
  onThemeChange?: (theme: Theme) => void;
}

/**
 * The theme to show. A `theme` prop means the host app controls it, as
 * TanStack Devtools does for its plugins, so there's nothing for the user to
 * pick. Without one, the user's choice in the panel is used and remembered.
 *
 * Call it inside `ShadowHost`, which renders only on the client, so reading
 * storage can't cause a hydration mismatch.
 */
export function useThemeChoice(controlled: Theme | undefined): ThemeChoice {
  const [chosen, setChosen] = useState<Theme>(loadTheme);
  if (controlled !== undefined) return { theme: controlled };
  return {
    theme: chosen,
    onThemeChange: (theme) => {
      setChosen(theme);
      saveTheme(theme);
    }
  };
}

/**
 * Sets the colour scheme for everything inside it. The colour tokens hold
 * `light-dark()` values, which resolve where they're used, so they follow it.
 */
export function ThemeScope({
  theme,
  children
}: {
  theme: Theme;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="theme" data-theme={theme}>
      {children}
    </div>
  );
}
