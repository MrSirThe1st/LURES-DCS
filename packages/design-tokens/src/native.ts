import { colors, radii, spacing, typography } from './index.js';

/** React Native theme object derived from the same tokens as the desktop UI. */
export const nativeTheme = {
  colors: {
    background: colors.background,
    surface: colors.surface,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
    primary: colors.primary,
    primaryForeground: colors.primaryForeground,
    destructive: colors.destructive,
    destructiveForeground: colors.destructiveForeground,
    success: colors.success,
    warning: colors.warning,
    focus: colors.focus,
  },
  spacing,
  radii,
  typography: {
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    lineHeight: typography.lineHeight,
    /** Temporary — TODO: select production typography */
    fontFamily: {
      sans: 'System',
      mono: 'monospace',
    },
  },
} as const;

export type NativeTheme = typeof nativeTheme;
