import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { CompletionChecklist, type CompletionItem } from "./completion-checklist";
import type { SetupStep, VerificationState } from "./setup-data";

export function StepPreviewPublish({ items, onStep, verification, onPreview }: {
  items: CompletionItem[];
  onStep: (step: SetupStep) => void;
  verification: VerificationState;
  onPreview: () => void;
}) {
  return (
    <div className="space-y-5">
      {verification !== "ready" && (
        <div role="status" className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-warn-fg">
          <Icon name="alert" className="mt-0.5 size-4" />
          <div><p className="font-semibold">{verification === "pending" ? "Verification pending" : "Publishing suspended"}</p><p className="mt-1">{verification === "pending" ? "Publishing becomes available once your business is verified." : "Publishing is paused for this workspace. You can still save your draft."}</p></div>
        </div>
      )}
      <AdminButton variant="outline" size="xs" onClick={onPreview}>Open full preview</AdminButton>
      <div>
        <h2 className="text-sm font-semibold">{items.some((item) => item.issue) ? "Complete these items to publish" : "Ready to publish"}</h2>
        <CompletionChecklist items={items} onStep={onStep} />
      </div>
    </div>
  );
}
