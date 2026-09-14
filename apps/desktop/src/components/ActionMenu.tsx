import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: 'default' | 'destructive';
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  label: string;
};

export function ActionMenu({ items, label }: ActionMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const visible = items.filter((item) => item.label);

  function placeMenu() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 196;
    const estimatedHeight = visible.length * 36 + 8;
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    const below = rect.bottom + 4;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 4)
        : below;
    setCoords({ top, left });
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onReposition() {
      placeMenu();
    }

    placeMenu();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, visible.length]);

  if (visible.length === 0) return null;

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-background hover:text-text-primary"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <span className="text-lg leading-none" aria-hidden="true">
          ⋯
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className="fixed z-dropdown min-w-[12rem] border border-border bg-surface py-space-xs shadow-sm"
              style={{ top: coords.top, left: coords.left, width: 196 }}
            >
              {visible.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={[
                    'block w-full px-space-md py-space-sm text-left text-sm disabled:opacity-50',
                    item.tone === 'destructive' ? 'text-destructive' : 'text-text-primary',
                    'hover:bg-background',
                  ].join(' ')}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
