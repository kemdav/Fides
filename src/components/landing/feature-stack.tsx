"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

export type FeatureItem = {
  title: string;
  description: string;
  icon: {
    src: string;
    inset: string;
    bleed: string;
  };
  solid?: string;
};

const SHRINK = 0.04;
const DIM = 0.05;
const SEGMENT = 65;
const HOLD = 30;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function FeatureStack({ items, children }: { items: FeatureItem[]; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const count = items.length;

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = cardRefs.current;
      const viewport = window.innerHeight;
      const segment = (viewport * SEGMENT) / 100;
      const travelled = reduced ? count : -outer.getBoundingClientRect().top / segment;
      const u = Math.min(count - 1, Math.max(0, travelled));

      const arrived = cards.map((_, i) => (i === 0 ? 1 : clamp(u - (i - 1))));
      cards.forEach((el, i) => {
        if (!el) return;
        let covered = 0;
        for (let j = i + 1; j < count; j++) covered += arrived[j];
        const shift = (1 - easeOut(arrived[i])) * viewport;
        el.style.transform = `translateY(${shift}px) scale(${1 - SHRINK * covered})`;
        el.style.filter = covered ? `brightness(${1 - DIM * covered})` : "";
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  return (
    <div ref={outerRef} style={{ height: `${100 + SEGMENT * (count - 1) + HOLD}svh` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden px-4 pt-16 text-center text-ink sm:px-8 lg:pt-[88px]">
        {children}

        <div className="relative mx-auto mt-10 h-[400px] w-full max-w-[1000px] text-left sm:mt-[83px] lg:h-[336px]">
          {items.map((item, i) => (
            <article
              key={item.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              style={{
                ["--i" as string]: i,
                backgroundColor: item.solid,
                transform: i === 0 ? undefined : "translateY(100svh)",
                zIndex: i,
              }}
              className="absolute inset-x-0 top-[calc(var(--i)_*_14px)] flex origin-top flex-col gap-5 rounded-3xl bg-burnt p-6 text-white shadow-[0_-12px_32px_-12px_rgb(9_16_29/0.35)] will-change-transform sm:flex-row sm:gap-12 sm:p-12 lg:top-[calc(var(--i)_*_24px)]"
            >
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-powder lg:size-[120px]">
                <div className="relative size-10 lg:size-16">
                  <div className="absolute" style={{ inset: item.icon.inset }}>
                    <div className="absolute" style={{ inset: item.icon.bleed }}>
                      <Image src={item.icon.src} alt="" fill aria-hidden className="max-w-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <h3 className="text-2xl/8 font-semibold lg:text-[32px]/9">{item.title}</h3>
                <p className="text-base/6 font-light lg:text-lg/5">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
