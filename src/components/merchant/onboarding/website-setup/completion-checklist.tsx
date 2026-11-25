import Link from "next/link";
import { Icon } from "@/components/admin/icon";
import type { SetupStep } from "./setup-data";

export type CompletionItem = {
  label: string;
  issue?: string;
} & ({ step: SetupStep } | { href: string });

export function CompletionChecklist({ items, onStep }: { items: CompletionItem[]; onStep: (step: SetupStep) => void }) {
  return (
    <ul aria-label="Publishing checklist" className="divide-y divide-hairline">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3 py-3.5">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${item.issue ? "bg-warn-bg text-warn-fg" : "bg-wash text-success"}`}>
            <Icon name={item.issue ? "alert" : "check"} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{item.label}<span className="sr-only">{item.issue ? ", incomplete" : ", complete"}</span></p>
            {item.issue && ("step" in item
              ? <button type="button" className="mt-0.5 text-left text-sm text-burnt underline underline-offset-2" onClick={() => onStep(item.step)}>{item.issue}</button>
              : <Link className="mt-0.5 inline-block text-sm text-burnt underline underline-offset-2" href={item.href}>{item.issue}</Link>)}
          </div>
        </li>
      ))}
    </ul>
  );
}
