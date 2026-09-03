/**
 * Design tokens — implementation source of truth.
 *
 * Production brand palette and typography are NOT finalized.
 * Neutral values below are temporary scaffolding so apps can run.
 * See docs/blueprint/product/design-dna.md
 */

export const colors = {
  background: '#f4f4f5',
  surface: '#ffffff',
  textPrimary: '#18181b',
  textSecondary: '#52525b',
  border: '#d4d4d8',
  primary: '#27272a',
  primaryForeground: '#fafafa',
  destructive: '#7f1d1d',
  destructiveForeground: '#fef2f2',
  success: '#14532d',
  warning: '#713f12',
  focus: '#3f3f46',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const typography = {
  /** Temporary system stacks — TODO: select production typography */
  fontFamilySans: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: {
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
  },
} as const;

export const motion = {
  durationFast: '120ms',
  durationNormal: '200ms',
  durationSlow: '320ms',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 40,
  toast: 50,
} as const;

export const tokens = {
  colors,
  spacing,
  radii,
  typography,
  motion,
  zIndex,
} as const;

export type DesignTokens = typeof tokens;
