import { useLayoutEffect, useState } from "react";
import type { CSSProperties, RefObject } from "react";

const VIEWPORT_GUTTER = 12;
const FIELD_GAP = 6;

export function useFloatingFieldPanel(
  open: boolean,
  trigger: RefObject<HTMLButtonElement | null>,
  preferredWidth: number,
  preferredHeight: number,
): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open) return;

    function position() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(Math.max(rect.width, preferredWidth), window.innerWidth - 2 * VIEWPORT_GUTTER);
      const left = Math.max(VIEWPORT_GUTTER, Math.min(rect.left, window.innerWidth - width - VIEWPORT_GUTTER));
      const availableBelow = window.innerHeight - rect.bottom - FIELD_GAP - VIEWPORT_GUTTER;
      const availableAbove = rect.top - FIELD_GAP - VIEWPORT_GUTTER;
      const maxHeight = Math.min(preferredHeight, window.innerHeight - 2 * VIEWPORT_GUTTER);
      const placement = availableBelow >= maxHeight
        ? { top: rect.bottom + FIELD_GAP }
        : availableAbove >= maxHeight
          ? { bottom: window.innerHeight - rect.top + FIELD_GAP }
          : { top: Math.max(VIEWPORT_GUTTER, window.innerHeight - maxHeight - VIEWPORT_GUTTER) };

      setStyle({ position: "fixed", left, right: "auto", width, minWidth: 0, maxWidth: "none", maxHeight, ...placement });
    }

    const initialFrame = requestAnimationFrame(position);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, preferredHeight, preferredWidth, trigger]);

  return open ? style ?? { position: "fixed", visibility: "hidden" } : undefined;
}
