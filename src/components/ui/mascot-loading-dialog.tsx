"use client";

import Image from "next/image";
import { useId } from "react";
import { Modal } from "./modal";

export function MascotLoadingDialog({ label = "Please wait…" }: { label?: string }) {
  const labelId = useId();

  return (
    <Modal
      open
      unstyled
      labelledBy={labelId}
      onClose={() => {}}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none place-items-center bg-transparent p-4 open:grid"
    >
      <div role="status" className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-line bg-white px-6 py-7 text-center shadow-xl">
        <Image src="/images/landing/fox-hero.svg" alt="" width={128} height={131} loading="eager" className="float-slow h-auto w-32" />
        <span id={labelId} className="text-base font-semibold text-ink">{label}</span>
        <span aria-hidden="true" className="flex gap-1.5 text-burnt">
          <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse motion-safe:[animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse motion-safe:[animation-delay:300ms]" />
        </span>
      </div>
    </Modal>
  );
}
