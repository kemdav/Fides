import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const edge = 8;
const gap = 6;

export function useAnchoredPopover<T extends HTMLElement>(
  open: boolean,
  triggerRef: RefObject<HTMLButtonElement | null>,
  { width, maxHeight, preferAbove = false, fitContent = false }: {
    width?: number;
    maxHeight: number;
    preferAbove?: boolean;
    fitContent?: boolean;
  },
): RefObject<T | null> {
  const panelRef = useRef<T>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!open || !trigger || !panel) return;

    function position() {
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const viewport = document.documentElement;
      const panelWidth = Math.min(width ?? rect.width, viewport.clientWidth - edge * 2);
      const below = viewport.clientHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      const left = Math.max(edge, Math.min(rect.left, viewport.clientWidth - panelWidth - edge));
      panel.style.width = `${panelWidth}px`;
      const viewportLimit = Math.min(maxHeight, viewport.clientHeight - edge * 2);
      const contentHeight = fitContent ? Math.min(viewportLimit, panel.scrollHeight + panel.offsetHeight - panel.clientHeight) : viewportLimit;
      const opensAbove = preferAbove ? above >= contentHeight || above > below : below < contentHeight && above > below;
      const available = opensAbove ? above : below;
      const shiftIntoView = fitContent && available < contentHeight;
      const idealTop = opensAbove ? rect.top - gap - contentHeight : rect.bottom + gap;
      const fittedTop = Math.max(edge, Math.min(idealTop, viewport.clientHeight - edge - contentHeight));
      Object.assign(panel.style, {
        left: `${left}px`,
        maxHeight: `${Math.max(0, fitContent ? viewportLimit : Math.min(viewportLimit, available))}px`,
        top: shiftIntoView ? `${fittedTop}px` : opensAbove ? "auto" : `${Math.max(edge, rect.bottom + gap)}px`,
        bottom: opensAbove && !shiftIntoView ? `${Math.max(edge, viewport.clientHeight - rect.top + gap)}px` : "auto",
      });
    }

    panel.showPopover?.();
    position();
    const observer = fitContent ? new ResizeObserver(position) : undefined;
    observer?.observe(panel);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      panel.hidePopover?.();
      observer?.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, triggerRef, width, maxHeight, preferAbove, fitContent]);

  return panelRef;
}
