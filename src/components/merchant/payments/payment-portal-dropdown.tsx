"use client";

import { RowActionMenu, type RowActionMenuProps } from "@/components/admin/row-action-menu";

<<<<<<< HEAD
export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "primary";
  disabled?: boolean;
}

interface PaymentPortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  items: DropdownMenuItem[];
}

export function PaymentPortalDropdown({
  isOpen,
  onClose,
  anchorEl,
  items,
}: PaymentPortalDropdownProps) {
  const [mounted, setMounted] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  const [coords, setCoords] = React.useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false,
  });

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position relative to viewport with flip safety
  React.useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const visibleCount = items.filter((item) => !item.disabled).length;
      const menuHeight = visibleCount * 36 + 16;
      const menuWidth = 176; // w-44

      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

      const top = openUpward ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
      let left = rect.right - menuWidth;

      // Bound checking
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setCoords({ top, left, openUpward });
    };

    updatePosition();

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current();
    };

    const handleResize = () => {
      onCloseRef.current();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, anchorEl, items]);

  // Handle outside click & Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (anchorEl?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, anchorEl]);

  if (!mounted || !isOpen || !anchorEl) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      className="w-44 rounded-xl border border-[#E2E8F0] bg-white py-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        if (item.disabled) return null;

        const isDanger = item.tone === "danger";
        const isPrimary = item.tone === "primary";

        return (
          <button
            key={idx}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              item.onClick();
            }}
            className={`flex w-full items-center px-3.5 py-2 text-left text-xs font-semibold transition-colors ${
              isDanger
                ? "text-[#DC2626] hover:bg-[#FEF2F2]"
                : isPrimary
                ? "text-[#C35000] hover:bg-[#FFF7ED]"
                : "text-[#1E293B] hover:bg-[#F8FAFC]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
=======
export type { RowActionMenuItem as DropdownMenuItem } from "@/components/admin/row-action-menu";

export function PaymentPortalDropdown(props: Omit<RowActionMenuProps, "label">) {
  return <RowActionMenu {...props} label="Payment actions" />;
>>>>>>> e0f2bf585edf876750be2af6d4b61799819c43bc
}
