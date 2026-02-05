import type { SemanticTokens } from '../design-tokens/semantic';
import { semanticTokenKeys } from '../design-tokens/semantic';
import { lightTheme } from './light';
import { darkTheme } from './dark';

export type ThemeName = 'light' | 'dark';

const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * Applies CSS variables to the document root
 *
 * This function takes a theme object and sets all semantic tokens
 * as CSS custom properties on :root or [data-theme] attribute.
 *
 * @param theme - The theme object containing semantic token values
 * @param target - Optional target element (defaults to document.documentElement)
 */
function applyThemeVariables(
  theme: SemanticTokens,
  target: HTMLElement = document.documentElement
): void {
  // Background tokens
  Object.entries(theme.background).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.background[
        key as keyof typeof semanticTokenKeys.background
      ];
    target.style.setProperty(cssVar, value);
  });

  // Text tokens
  Object.entries(theme.text).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.text[key as keyof typeof semanticTokenKeys.text];
    target.style.setProperty(cssVar, value);
  });

  // Border tokens
  Object.entries(theme.border).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.border[key as keyof typeof semanticTokenKeys.border];
    target.style.setProperty(cssVar, value);
  });

  // Accent tokens
  Object.entries(theme.accent).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.accent[key as keyof typeof semanticTokenKeys.accent];
    target.style.setProperty(cssVar, value);
  });

  // State tokens
  Object.entries(theme.state).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.state[key as keyof typeof semanticTokenKeys.state];
    target.style.setProperty(cssVar, value);
  });

  // Status tokens
  Object.entries(theme.status).forEach(([key, value]) => {
    const cssVar =
      semanticTokenKeys.status[key as keyof typeof semanticTokenKeys.status];
    target.style.setProperty(cssVar, value);
  });
}

/**
 * Initialize the theme system
 *
 * Call this once on app startup to apply the default theme.
 * Reads theme preference from localStorage if available.
 */
export function initTheme(): ThemeName {
  const stored = localStorage.getItem('app-theme') as ThemeName | null;
  const theme = stored && themes[stored] ? stored : 'light';

  setTheme(theme);
  return theme;
}

/**
 * Set the active theme
 *
 * @param themeName - 'light' or 'dark'
 */
export function setTheme(themeName: ThemeName): void {
  const theme = themes[themeName];

  if (!theme) {
    console.warn(`Theme "${themeName}" not found, falling back to light`);
    applyThemeVariables(lightTheme);
    document.documentElement.setAttribute('data-theme', 'light');
    return;
  }

  applyThemeVariables(theme);
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('app-theme', themeName);
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): ThemeName {
  const current = document.documentElement.getAttribute(
    'data-theme'
  ) as ThemeName;
  const next: ThemeName = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Get the current active theme name
 */
export function getCurrentTheme(): ThemeName {
  return (
    (document.documentElement.getAttribute('data-theme') as ThemeName) ||
    'light'
  );
}

// Export themes for external access (e.g., tests, documentation)
export { lightTheme, darkTheme };
