import { cn } from "@/lib/utils";

const tone =
  "bg-[radial-gradient(circle_at_30%_26%,#9bb0f5_0%,#5a74e0_34%,#3249bd_70%,#202f93_100%)] shadow-[inset_-14px_-22px_44px_rgb(18_28_110/0.5),0_30px_50px_-24px_rgb(9_16_29/0.4)]";

export function Sphere({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pointer-events-none absolute rounded-full", tone, className)} />;
}
