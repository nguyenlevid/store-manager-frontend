# Theming System Documentation

## Overview

This application uses a **semantic token-based theming system** built on CSS variables, with Tailwind CSS configured to reference these tokens exclusively. This architecture ensures:

- **Single source of truth** for all colors
- **Theme switching without component changes**
- **Type-safe design tokens**
- **Scalable and maintainable** codebase

---

## Architecture

### Foundation: CSS Variables + Semantic Tokens

```
design-tokens/
├── palette.ts      → Raw color values (NEVER imported by UI)
└── semantic.ts     → Semantic token names and CSS variable mappings

theme/
├── light.ts        → Light theme (maps semantic → palette)
├── dark.ts         → Dark theme (maps semantic → palette)
└── index.ts        → Theme application and switching logic

tailwind.config.js  → Maps semantic tokens → CSS variables
```

### Token Hierarchy

1. **Palette** (`palette.ts`): Raw color values
   - Example: `#3b82f6`, `#171717`
   - **Never imported by UI components**

2. **Semantic Tokens** (`semantic.ts`): Meaning-based names
   - Example: `background.surface`, `text.primary`, `accent.danger`
   - Defined as TypeScript types

3. **Theme Files** (`light.ts`, `dark.ts`): Maps semantic → palette
   - Example: `text.primary: palette.neutral[900]` (light mode)

4. **CSS Variables**: Applied to `:root` at runtime
   - Example: `--text-primary: #171717`

5. **Tailwind Utilities**: Reference CSS variables
   - Example: `text-text-primary` → `var(--text-primary)`

---

## Semantic Token Categories

### Backgrounds
- `background.app` - Main app/page background
- `background.surface` - Cards, modals, panels
- `background.surfaceSubtle` - Table headers, subtle surfaces
- `background.hover` - Hover state for interactive surfaces
- `background.selected` - Selected/active state
- `background.overlay` - Modal backdrops

### Text
- `text.primary` - Main body text (high contrast)
- `text.secondary` - Supporting text
- `text.muted` - De-emphasized text (placeholders, help)
- `text.inverse` - Text on dark backgrounds
- `text.link` - Hyperlinks
- `text.linkHover` - Hyperlink hover state

### Borders
- `border.default` - Standard borders
- `border.subtle` - Subtle dividers
- `border.strong` - Emphasized borders
- `border.focus` - Focus rings

### Accent (Interactive)
- `accent.primary` / `primaryHover` / `primaryActive` / `primarySubtle`
- `accent.secondary` / `secondaryHover` / `secondaryActive`
- `accent.success` / `successHover` / `successSubtle`
- `accent.warning` / `warningHover` / `warningSubtle`
- `accent.danger` / `dangerHover` / `dangerSubtle`

### State
- `state.disabled` - Disabled background
- `state.disabledText` - Disabled text
- `state.focus` - Focus indicator
- `state.selected` - Selected state
- `state.selectedText` - Text in selected state

### Status (Badges/Indicators)
- `status.successBg` / `successText`
- `status.warningBg` / `warningText`
- `status.dangerBg` / `dangerText`
- `status.infoBg` / `infoText`

---

## Usage Rules

### ✅ ALLOWED

```tsx
// Semantic token utilities (good)
<div class="bg-bg-surface border border-border-default text-text-primary">
  <button class="bg-accent-primary text-text-inverse hover:bg-accent-primary-hover">
    Save
  </button>
</div>

// Layout and spacing (good)
<div class="p-4 flex gap-2 rounded-lg">
  ...
</div>

// Typography scale (good)
<p class="text-sm font-medium">
  ...
</p>
```

### ❌ FORBIDDEN

```tsx
// Hardcoded Tailwind colors (BAD - don't do this!)
<div class="bg-gray-100 text-blue-600 border-red-500">
  ...
</div>

// Arbitrary color values (BAD - don't do this!)
<div class="bg-[#3b82f6] text-[#171717]">
  ...
</div>

// Inline styles for color (BAD - don't do this!)
<div style="background-color: #3b82f6">
  ...
</div>
```

---

## Adding a New Theme

1. **Create theme file** (e.g., `theme/brand.ts`):

```ts
import { palette } from '../design-tokens/palette';
import type { SemanticTokens } from '../design-tokens/semantic';

export const brandTheme: SemanticTokens = {
  background: {
    app: palette.neutral[50],
    surface: palette.pure.white,
    // ... map all semantic tokens
  },
  text: {
    primary: palette.neutral[900],
    // ... etc
  },
  // ... all other categories
};
```

2. **Register in `theme/index.ts`**:

```ts
import { brandTheme } from './brand';

const themes = {
  light: lightTheme,
  dark: darkTheme,
  brand: brandTheme, // Add here
} as const;

export type ThemeName = 'light' | 'dark' | 'brand'; // Update type
```

3. **Use**: `setTheme('brand')`

**No component changes required!**

---

## Adding a New Semantic Token

### 1. Update `design-tokens/semantic.ts`

```ts
export type SemanticTokens = {
  // ... existing categories
  
  // New category
  illustration: {
    primary: string;
    secondary: string;
  };
};

export const semanticTokenKeys = {
  // ... existing keys
  
  illustration: {
    primary: '--illustration-primary',
    secondary: '--illustration-secondary',
  },
} as const;
```

### 2. Update all theme files

```ts
// theme/light.ts
export const lightTheme: SemanticTokens = {
  // ... existing mappings
  
  illustration: {
    primary: palette.primary[500],
    secondary: palette.neutral[300],
  },
};

// theme/dark.ts (same structure)
```

### 3. Update Tailwind config

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // ... existing tokens
        
        illustration: {
          primary: 'var(--illustration-primary)',
          secondary: 'var(--illustration-secondary)',
        },
      },
    },
  },
};
```

### 4. Update theme application

```ts
// theme/index.ts - in applyThemeVariables()
Object.entries(theme.illustration).forEach(([key, value]) => {
  const cssVar = semanticTokenKeys.illustration[key];
  target.style.setProperty(cssVar, value);
});
```

### 5. Use in components

```tsx
<svg class="text-illustration-primary">
  ...
</svg>
```

---

## Component Guidelines

### Button Component Example

```tsx
// ✅ GOOD - uses semantic tokens only
const variantStyles = {
  primary: 'bg-accent-primary hover:bg-accent-primary-hover',
  danger: 'bg-accent-danger hover:bg-accent-danger-hover',
};

// ❌ BAD - hardcoded colors
const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700',
  danger: 'bg-red-600 hover:bg-red-700',
};
```

### Table Component Example

```tsx
// ✅ GOOD
<table class="bg-bg-surface">
  <thead class="bg-bg-surface-subtle">
    <tr class="border-b border-border-subtle">
      ...
    </tr>
  </thead>
  <tbody>
    <tr class="hover:bg-bg-hover">
      <td class="text-text-primary">...</td>
    </tr>
  </tbody>
</table>
```

---

## Theme Switching API

### Initialize (app startup)

```ts
import { initTheme } from '@/theme';

// Reads from localStorage, defaults to 'light'
initTheme();
```

### Switch theme

```ts
import { setTheme, toggleTheme, getCurrentTheme } from '@/theme';

// Set specific theme
setTheme('dark');

// Toggle between light/dark
toggleTheme();

// Get current theme
const current = getCurrentTheme(); // 'light' | 'dark'
```

---

## Contributor Rules

### Before committing:

1. **No hardcoded colors** in JSX or component files
2. **No Tailwind default colors** (gray-100, blue-500, etc.)
3. **All colors must use semantic tokens**
4. **Palette colors** only in theme files
5. **New colors?** Add semantic tokens first

### Code review checklist:

- [ ] No `bg-gray-*`, `text-blue-*`, `border-red-*`
- [ ] No `#hexvalues` or `rgb()` in components
- [ ] Only `bg-bg-*`, `text-text-*`, `accent-*`, `border-*`, `status-*`
- [ ] Tailwind used for layout/spacing only
- [ ] Theme switching tested (if theme-sensitive)

---

## Tailwind Do's and Don'ts

### ✅ DO use Tailwind for:
- Spacing: `p-4`, `m-2`, `gap-3`, `space-y-6`
- Layout: `flex`, `grid`, `w-full`, `h-screen`
- Typography scale: `text-sm`, `text-lg`, `font-medium`, `font-bold`
- Responsiveness: `sm:`, `md:`, `lg:`, `xl:`
- Borders/Shadows: `rounded-lg`, `shadow-sm` (size/shape only)

### ❌ DON'T use Tailwind for:
- Color values: ~~`bg-gray-100`~~, ~~`text-blue-600`~~
- Arbitrary colors: ~~`bg-[#3b82f6]`~~
- Opacity on colors: ~~`bg-gray-100/50`~~ (use semantic tokens with alpha)

---

## Dark Mode Support

Dark mode is **scaffolded and ready**. To activate:

```ts
setTheme('dark');
```

The `darkTheme` in `theme/dark.ts` is fully functional. Dark mode uses:
- Lower contrast (reduces eye strain)
- Elevated surfaces are lighter, not darker
- Avoids pure black (#000000)
- Maintains semantic token structure

To improve dark mode:
1. Edit `theme/dark.ts` palette mappings
2. No component changes needed
3. Test with `setTheme('dark')`

---

## FAQ

**Q: How do I change the primary brand color?**
A: Edit `palette.ts` → update `primary` shades → redeploy. All components update automatically.

**Q: Can I use Tailwind's `bg-opacity-50`?**
A: No. Instead, create semantic tokens with alpha: `rgba(...)` in theme files.

**Q: What if I need a color not in semantic tokens?**
A: Add it as a semantic token first (see "Adding a New Semantic Token" above).

**Q: Can I import `palette.ts` in a component?**
A: **No!** Components must never import palette. Use semantic tokens only.

**Q: How do I white-label the app?**
A: Create a new theme file with your brand's palette mappings. No code changes required.

---

## Testing

### Visual regression testing

```bash
# Test theme switching
npm run dev
# Browser console:
setTheme('dark')  // Check all pages
setTheme('light') // Check all pages
```

### Unit testing with themes

```ts
import { setTheme, lightTheme, darkTheme } from '@/theme';

test('button uses semantic tokens', () => {
  setTheme('light');
  // Assert computed styles use CSS variables
});
```

---

## Migration Notes

### From old system to new:

```diff
- <div class="bg-gray-100 text-gray-900">
+ <div class="bg-bg-surface-subtle text-text-primary">

- <button class="bg-blue-600 hover:bg-blue-700">
+ <button class="bg-accent-primary hover:bg-accent-primary-hover">

- <p class="text-red-600">Error</p>
+ <p class="text-accent-danger">Error</p>
```

---

## Summary

- **Palette**: Raw colors (never touched by UI)
- **Semantic**: Meaning-based names (consumed by UI)
- **Themes**: Map semantic → palette
- **CSS vars**: Applied at runtime
- **Tailwind**: References CSS vars only
- **Components**: Use semantic tokens exclusively

**Result**: Theme changes require zero component refactoring.
