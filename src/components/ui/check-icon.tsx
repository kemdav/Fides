import { cn } from "@/lib/utils";

export type CheckIconTone = "success" | "deep" | "powder";

const tones: Record<CheckIconTone, { disc: string; check: string }> = {
  success: { disc: "fill-success", check: "stroke-white" },
  deep: { disc: "fill-success-deep", check: "stroke-white" },
  powder: { disc: "fill-powder", check: "stroke-burnt" },
};

export function CheckIcon({ tone = "success", className }: { tone?: CheckIconTone; className?: string }) {
  const { disc, check } = tones[tone];
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6 shrink-0", className)}>
      <circle cx="12" cy="12" r="10" className={disc} />
      <path
        d="M7.5 12.4l3 3 6-6.4"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={check}
      />
    </svg>
  );
}
