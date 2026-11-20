import Image from "next/image";

interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"} ${className}`}>
      <Image
        src="/images/landing/fox-hero.svg"
        alt=""
        width={112}
        height={112}
        className={compact ? "mb-3 h-16 w-16 object-contain opacity-70" : "mb-5 h-24 w-24 object-contain opacity-70"}
      />
      <p className={compact ? "font-display text-lg text-ink" : "font-display text-2xl text-ink"}>
        {title}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}
