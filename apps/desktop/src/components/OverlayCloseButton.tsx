type OverlayCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

/** Far-right dismiss control for overlays. */
export function OverlayCloseButton({
  onClick,
  disabled = false,
  label = 'Close',
}: OverlayCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-lg leading-none text-text-secondary hover:bg-background hover:text-text-primary disabled:opacity-50"
    >
      ×
    </button>
  );
}
