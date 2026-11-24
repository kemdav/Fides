import { cn } from "@/lib/utils";

export function registrationFieldClasses(invalid: boolean) {
  return cn(
    "h-12 w-full rounded-lg border bg-white px-4 text-base leading-6 text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2",
    invalid
      ? "border-danger focus-visible:ring-danger/30"
      : "border-outline hover:border-ink/60 focus-visible:border-burnt focus-visible:ring-burnt/30"
  );
}
