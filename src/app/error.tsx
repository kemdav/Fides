"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center bg-powder px-4 py-12 sm:px-8 lg:px-[78px]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col-reverse items-center gap-10 lg:flex-row lg:justify-between lg:gap-16">
        <div className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <Link href="/" className="font-display text-4xl leading-none text-burnt">
            Fides
          </Link>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-5xl">
            Something went <span className="text-burnt">wrong</span>
          </h1>
          <p className="max-w-[460px] text-base/6 text-muted sm:text-xl/7">
            We could not load this page. Try again, and if it keeps happening, head back home.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
            <button type="button" onClick={reset} className={buttonClasses({ variant: "brand", size: "cta" })}>
              Try again
            </button>
            <Link href="/" className={buttonClasses({ variant: "brand-outline", size: "cta" })}>
              Back to home
            </Link>
          </div>
        </div>

        <div className="relative aspect-[466/508] w-[200px] shrink-0 sm:w-[280px] lg:w-[380px]">
          <Image
            src="/images/mascot/fox-mascot.png"
            alt="Fides fox mascot waving"
            fill
            priority
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 280px, 200px"
            className="object-contain"
          />
        </div>
      </div>
    </main>
  );
}
