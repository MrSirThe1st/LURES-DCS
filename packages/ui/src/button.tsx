import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { colors, radii, spacing, typography } from '@lures-dcs/design-tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, { background: string; color: string; border: string }> =
  {
    primary: {
      background: colors.primary,
      color: colors.primaryForeground,
      border: colors.primary,
    },
    secondary: {
      background: colors.surface,
      color: colors.textPrimary,
      border: colors.border,
    },
    destructive: {
      background: colors.destructive,
      color: colors.destructiveForeground,
      border: colors.destructive,
    },
  };

/** Minimal desktop Button primitive — no product business rules. */
export function Button({
  children,
  variant = 'primary',
  style,
  type = 'button',
  ...props
}: ButtonProps) {
  const palette = variantStyles[variant];

  return (
    <button
      type={type}
      {...props}
      style={{
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        borderRadius: radii.md,
        padding: `${spacing.sm}px ${spacing.md}px`,
        fontFamily: typography.fontFamilySans,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.medium,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
