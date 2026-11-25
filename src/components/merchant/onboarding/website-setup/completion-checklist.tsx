import Link from "next/link";
import { Icon } from "@/components/admin/icon";
import type { SetupStep } from "./setup-data";

export type CompletionItem = {
  label: string;
  issue?: string;
} & ({ step: SetupStep } | { href: string });

const rowClass = "group flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-mist focus-visible:outline-2 focus-visible:outline-burnt";

export function CompletionChecklist({ items, onStep }: { items: CompletionItem[]; onStep: (step: SetupStep) => void }) {
  return (
    <ul aria-label="Publishing checklist" className="mt-2 divide-y divide-hairline">
      {items.map((item) => {
        const content = (
          <>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${item.issue ? "bg-warn-bg text-warn-fg" : "bg-wash text-success"}`}>
              <Icon name={item.issue ? "alert" : "check"} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.label}<span className="sr-only">{item.issue ? ", incomplete" : ", complete"}</span></span>
              {item.issue && <span className="mt-0.5 block text-sm text-burnt">{item.issue}</span>}
            </span>
            <span className="shrink-0 self-center text-xs font-semibold text-burnt group-hover:underline">
              {"step" in item ? "Edit" : "Manage"}
            </span>
          </>
        );

        return (
          <li key={item.label}>
            {"step" in item
              ? <button type="button" className={rowClass} onClick={() => onStep(item.step)}>{content}</button>
              : <Link className={rowClass} href={item.href}>{content}</Link>}
          </li>
        );
      })}
    </ul>
  );
}
