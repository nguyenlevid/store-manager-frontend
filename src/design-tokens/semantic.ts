/**
 * Semantic Design Tokens
 *
 * This file defines semantic token names ONLY.
 * No color values here - those come from theme files.
 *
 * These tokens represent MEANING, not appearance.
 * Components should only reference these semantic names.
 *
 * Naming convention: {category}.{context}.{variant?}.{state?}
 */

export type SemanticTokens = {
  // Backgrounds - surfaces and page backgrounds
  background: {
    app: string; // Main app background
    surface: string; // Cards, modals, panels
    surfaceSubtle: string; // Subtle surface variation (table headers, etc)
    hover: string; // Hover state for interactive surfaces
    selected: string; // Selected/active state
    overlay: string; // Modal backdrop
  };

  // Text - all text colors
  text: {
    primary: string; // Main body text
    secondary: string; // Supporting text
    muted: string; // De-emphasized text (placeholders, help text)
    inverse: string; // Text on dark backgrounds
    link: string; // Hyperlinks
    linkHover: string; // Hyperlink hover state
  };

  // Borders - all border colors
  border: {
    default: string; // Standard borders (inputs, cards)
    subtle: string; // Subtle dividers
    strong: string; // Emphasized borders
    focus: string; // Focus ring color
  };

  // Accent colors - interactive, branded, status-indicating
  accent: {
    primary: string; // Primary CTA, main actions
    primaryHover: string;
    primaryActive: string;
    primarySubtle: string; // Badges, chips with primary meaning

    secondary: string; // Secondary actions
    secondaryHover: string;
    secondaryActive: string;

    success: string; // Success states
    successHover: string;
    successSubtle: string;

    warning: string; // Warning states
    warningHover: string;
    warningSubtle: string;

    danger: string; // Destructive/error states
    dangerHover: string;
    dangerSubtle: string;
  };

  // State colors - component states
  state: {
    disabled: string; // Disabled state background
    disabledText: string; // Disabled state text
    focus: string; // Focus indicator
    selected: string; // Selected state
    selectedText: string; // Text in selected state
  };

  // Status indicators - for badges, dots, indicators
  status: {
    successBg: string;
    successText: string;
    warningBg: string;
    warningText: string;
    dangerBg: string;
    dangerText: string;
    infoBg: string;
    infoText: string;
  };
};

/**
 * CSS variable names mapped to semantic tokens
 * Used by Tailwind config
 */
export const semanticTokenKeys = {
  background: {
    app: '--background-app',
    surface: '--background-surface',
    surfaceSubtle: '--background-surface-subtle',
    hover: '--background-hover',
    selected: '--background-selected',
    overlay: '--background-overlay',
  },
  text: {
    primary: '--text-primary',
    secondary: '--text-secondary',
    muted: '--text-muted',
    inverse: '--text-inverse',
    link: '--text-link',
    linkHover: '--text-link-hover',
  },
  border: {
    default: '--border-default',
    subtle: '--border-subtle',
    strong: '--border-strong',
    focus: '--border-focus',
  },
  accent: {
    primary: '--accent-primary',
    primaryHover: '--accent-primary-hover',
    primaryActive: '--accent-primary-active',
    primarySubtle: '--accent-primary-subtle',

    secondary: '--accent-secondary',
    secondaryHover: '--accent-secondary-hover',
    secondaryActive: '--accent-secondary-active',

    success: '--accent-success',
    successHover: '--accent-success-hover',
    successSubtle: '--accent-success-subtle',

    warning: '--accent-warning',
    warningHover: '--accent-warning-hover',
    warningSubtle: '--accent-warning-subtle',

    danger: '--accent-danger',
    dangerHover: '--accent-danger-hover',
    dangerSubtle: '--accent-danger-subtle',
  },
  state: {
    disabled: '--state-disabled',
    disabledText: '--state-disabled-text',
    focus: '--state-focus',
    selected: '--state-selected',
    selectedText: '--state-selected-text',
  },
  status: {
    successBg: '--status-success-bg',
    successText: '--status-success-text',
    warningBg: '--status-warning-bg',
    warningText: '--status-warning-text',
    dangerBg: '--status-danger-bg',
    dangerText: '--status-danger-text',
    infoBg: '--status-info-bg',
    infoText: '--status-info-text',
  },
} as const;
