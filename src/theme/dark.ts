import { palette } from '../design-tokens/palette';
import type { SemanticTokens } from '../design-tokens/semantic';

/**
 * Dark Theme
 *
 * Maps semantic tokens to palette values for dark mode.
 * Currently minimal - can be expanded when dark mode is needed.
 *
 * Dark mode principles:
 * - Lower contrast than light mode (reduces eye strain)
 * - Elevated surfaces are lighter, not darker
 * - Avoid pure black (#000000)
 */

export const darkTheme: SemanticTokens = {
  background: {
    app: palette.neutral[950], // Very dark gray, not pure black
    surface: palette.neutral[900], // Slightly lighter for cards
    surfaceSubtle: palette.neutral[800], // Elevated surfaces
    hover: palette.neutral[800],
    selected: palette.primary[900],
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  text: {
    primary: palette.neutral[50], // Off-white
    secondary: palette.neutral[300],
    muted: palette.neutral[500],
    inverse: palette.neutral[900],
    link: palette.primary[400],
    linkHover: palette.primary[300],
  },

  border: {
    default: palette.neutral[700],
    subtle: palette.neutral[800],
    strong: palette.neutral[600],
    focus: palette.primary[500],
  },

  accent: {
    primary: palette.primary[500],
    primaryHover: palette.primary[400],
    primaryActive: palette.primary[300],
    primarySubtle: palette.primary[900],

    secondary: palette.neutral[400],
    secondaryHover: palette.neutral[300],
    secondaryActive: palette.neutral[200],

    success: palette.success[500],
    successHover: palette.success[400],
    successSubtle: palette.success[900],

    warning: palette.warning[500],
    warningHover: palette.warning[400],
    warningSubtle: palette.warning[900],

    danger: palette.danger[500],
    dangerHover: palette.danger[400],
    dangerSubtle: palette.danger[900],
  },

  state: {
    disabled: palette.neutral[800],
    disabledText: palette.neutral[600],
    focus: palette.primary[500],
    selected: palette.primary[900],
    selectedText: palette.primary[300],
  },

  status: {
    successBg: palette.success[900],
    successText: palette.success[300],

    warningBg: palette.warning[900],
    warningText: palette.warning[300],

    dangerBg: palette.danger[900],
    dangerText: palette.danger[300],

    infoBg: palette.primary[900],
    infoText: palette.primary[300],
  },
};
