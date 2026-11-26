import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/admin/icon";

const benefits = ["Platform oversight", "Tenant management", "Account verification"];

export function AdminAuthShell({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return (
    <main className="flex min-h-dvh flex-col bg-mist lg:flex-row">
      <aside className="hidden flex-col justify-between bg-body px-12 py-16 text-white lg:flex lg:w-[47%] xl:px-[76px]">
        <Link href="/" className="w-fit font-display text-[40px] leading-[56px]">
          Fides.
        </Link>
        <div className="flex flex-col gap-6">
          {eyebrow ? <p className="text-xs font-bold uppercase">{eyebrow}</p> : null}
          <p className="font-display text-5xl leading-[1.4] xl:text-[58px] xl:leading-[81px]">
            Platform operations.
            <br />
            Clear oversight.
          </p>
          <p className="max-w-[620px] text-lg">A dedicated workspace for authorized Fides administrators.</p>
          <ul className="flex flex-col gap-4 pt-8 text-[15px] font-semibold">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <Icon name="check" weight="bold" className="size-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px]">Fides internal administration</p>
      </aside>

      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-6 sm:px-14 sm:py-10">
        <div className="flex w-full items-center justify-between">
          <Link href="/" className="font-display text-3xl text-body lg:hidden">
            Fides.
          </Link>
          <Link href="/" className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[11px] font-semibold text-subtle hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
            Go to fides.app <Icon name="arrow-right" weight="medium" className="size-4" />
          </Link>
        </div>
        <div className="flex w-full flex-1 items-center justify-center">{children}</div>
        <p className="text-[13px] text-subtle">Powered by Fides</p>
      </div>
    </main>
  );
}
