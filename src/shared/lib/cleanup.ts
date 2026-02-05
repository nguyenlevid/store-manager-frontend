/**
 * Cleanup Utility
 *
 * Removes deprecated storage items from previous versions.
 * Run once on app initialization to clean up user browsers.
 */

const DEPRECATED_KEYS = [
  'accessToken',
  'csrfToken',
  'refreshToken', // Should never be in localStorage, but clean just in case
];

/**
 * Remove deprecated localStorage items
 *
 * These tokens are now stored securely:
 * - accessToken: In memory (SolidJS signals)
 * - csrfToken: Read from cookie
 * - refreshToken: HttpOnly cookie (never exposed to JS)
 */
export function cleanupDeprecatedStorage(): void {
  try {
    let cleaned = 0;

    DEPRECATED_KEYS.forEach((key) => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.info(
        `🧹 Cleaned ${cleaned} deprecated token(s) from localStorage`
      );
    }
  } catch (error) {
    // Silent fail - localStorage might be disabled
    console.warn('Could not cleanup localStorage:', error);
  }
}
