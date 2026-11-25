"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

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

export function PaymentPortalDropdown({ isOpen, onClose, anchorEl, items }: PaymentPortalDropdownProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => !item.disabled);

  React.useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!isOpen || !anchorEl || !menu) return;

    const anchor = anchorEl.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const below = anchor.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? anchor.top - height - 4 : below;
    const left = Math.min(anchor.right - width, window.innerWidth - width - 8);
    menu.style.top = Math.max(8, top) + "px";
    menu.style.left = Math.max(8, left) + "px";
    menu.style.visibility = "visible";
    menu.querySelector("button")?.focus({ preventScroll: true });
  }, [isOpen, anchorEl, visibleItems.length]);

  React.useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorEl.contains(target) && !menuRef.current?.contains(target)) onClose();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [isOpen, anchorEl, onClose]);

  if (!isOpen || !anchorEl || visibleItems.length === 0) return null;

  const closeToAnchor = () => {
    anchorEl.focus({ preventScroll: true });
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      closeToAnchor();
      return;
    }

    const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    const last = buttons.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = current === last ? 0 : current + 1; break;
      case "ArrowUp": next = current <= 0 ? last : current - 1; break;
      case "Home": next = 0; break;
      case "End": next = last; break;
      default: return;
    }
    event.preventDefault();
    buttons[next]?.focus({ preventScroll: true });
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Payment actions"
      onKeyDown={handleKeyDown}
      className="invisible fixed z-50 w-44 rounded-[10px] border border-hairline bg-white py-1 shadow-lg"
    >
      {visibleItems.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            closeToAnchor();
            item.onClick();
          }}
          className={cn(
            "w-full px-4 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-burnt/40",
            item.tone === "danger" ? "text-danger-dark hover:bg-danger-bg" : "hover:bg-mist",
            item.tone === "primary" && "text-burnt-dark",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
