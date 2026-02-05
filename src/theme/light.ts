import { palette } from '../design-tokens/palette';
import type { SemanticTokens } from '../design-tokens/semantic';

/**
 * Light Theme
 *
 * Maps semantic tokens to palette values for light mode.
 * This is the default theme optimized for business applications:
 * - High contrast for readability
 * - Calm neutrals to reduce eye fatigue
 * - Clear hierarchy
 */

export const lightTheme: SemanticTokens = {
  background: {
    app: palette.neutral[50], // Very light gray, softer than pure white
    surface: palette.pure.white, // White for cards, modals
    surfaceSubtle: palette.neutral[100], // Table headers, subtle backgrounds
    hover: palette.neutral[100], // Row hover state
    selected: palette.primary[50], // Selected state with subtle primary tint
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal backdrop
  },

  text: {
    primary: palette.neutral[900], // Almost black, high contrast
    secondary: palette.neutral[600], // Medium gray for supporting text
    muted: palette.neutral[400], // Light gray for placeholders
    inverse: palette.pure.white, // White text on dark backgrounds
    link: palette.primary[600], // Blue links
    linkHover: palette.primary[700], // Darker on hover
  },

  border: {
    default: palette.neutral[200], // Standard border - subtle but visible
    subtle: palette.neutral[100], // Very subtle dividers
    strong: palette.neutral[300], // Emphasized borders
    focus: palette.primary[500], // Blue focus ring
  },

  accent: {
    // Primary (main CTAs, primary buttons)
    primary: palette.primary[600],
    primaryHover: palette.primary[700],
    primaryActive: palette.primary[800],
    primarySubtle: palette.primary[100],

    // Secondary (secondary buttons, less emphasis)
    secondary: palette.neutral[700],
    secondaryHover: palette.neutral[800],
    secondaryActive: palette.neutral[900],

    // Success
    success: palette.success[600],
    successHover: palette.success[700],
    successSubtle: palette.success[100],

    // Warning
    warning: palette.warning[500],
    warningHover: palette.warning[600],
    warningSubtle: palette.warning[100],

    // Danger
    danger: palette.danger[600],
    dangerHover: palette.danger[700],
    dangerSubtle: palette.danger[100],
  },

  state: {
    disabled: palette.neutral[100],
    disabledText: palette.neutral[400],
    focus: palette.primary[500],
    selected: palette.primary[100],
    selectedText: palette.primary[700],
  },

  status: {
    // Success status (badges, indicators)
    successBg: palette.success[100],
    successText: palette.success[800],

    // Warning status
    warningBg: palette.warning[100],
    warningText: palette.warning[800],

    // Danger status
    dangerBg: palette.danger[100],
    dangerText: palette.danger[800],

    // Info status
    infoBg: palette.primary[100],
    infoText: palette.primary[800],
  },
};
