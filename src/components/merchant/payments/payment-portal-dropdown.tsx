"use client";

import * as React from "react";
import { createPortal } from "react-dom";

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
  const [coords, setCoords] = React.useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position relative to viewport with flip safety
  React.useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuHeight = items.length * 36 + 16;
      const menuWidth = 176; // w-44

      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

      let top = openUpward ? rect.top - menuHeight : rect.bottom + 4;
      let left = rect.right - menuWidth;

      // Bound checking
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setCoords({ top, left, openUpward });
    };

    updatePosition();

    const handleScrollOrResize = () => {
      onClose();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, anchorEl, items.length, onClose]);

  // Handle outside click & Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (anchorEl && anchorEl.contains(target)) return;
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, anchorEl, onClose]);

  if (!mounted || !isOpen || !anchorEl) return null;

  return createPortal(
    <div
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
            onClick={() => {
              item.onClick();
              onClose();
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
}
