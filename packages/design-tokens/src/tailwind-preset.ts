import { colors, motion, radii, spacing, typography, zIndex } from './index.js';

/** Tailwind preset consuming design-tokens (no second independent palette). */
const preset = {
  theme: {
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        primary: {
          DEFAULT: colors.primary,
          foreground: colors.primaryForeground,
        },
        destructive: {
          DEFAULT: colors.destructive,
          foreground: colors.destructiveForeground,
        },
        success: colors.success,
        warning: colors.warning,
        focus: colors.focus,
        text: {
          primary: colors.textPrimary,
          secondary: colors.textSecondary,
        },
      },
      spacing: {
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
        full: `${radii.full}px`,
      },
      fontFamily: {
        sans: typography.fontFamilySans.split(',').map((s) => s.trim()),
        mono: typography.fontFamilyMono.split(',').map((s) => s.trim()),
      },
      fontSize: {
        sm: `${typography.fontSize.sm}px`,
        md: `${typography.fontSize.md}px`,
        lg: `${typography.fontSize.lg}px`,
        xl: `${typography.fontSize.xl}px`,
        '2xl': `${typography.fontSize['2xl']}px`,
      },
      transitionDuration: {
        fast: motion.durationFast,
        normal: motion.durationNormal,
        slow: motion.durationSlow,
      },
      zIndex: {
        base: String(zIndex.base),
        dropdown: String(zIndex.dropdown),
        sticky: String(zIndex.sticky),
        modal: String(zIndex.modal),
        toast: String(zIndex.toast),
      },
    },
  },
};

export default preset;
