import { Icon } from "@/components/admin/icon";
import { cn } from "@/lib/utils";

/**
 * Shared toolbar search (44px, icon, full width on phones, roomy on desktop so the placeholder is never cut off).
 * Pass `className` for the wrapper (for example to change the desktop width).
 */
export function SearchField({
  className,
  inputClassName,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { inputClassName?: string }) {
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-glyph" />
      <input
        type="search"
        className={cn(
          "h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-3 text-sm text-body transition-colors placeholder:text-subtle hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
          inputClassName
        )}
        {...props}
      />
    </div>
  );
}
