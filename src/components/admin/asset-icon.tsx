import Image from "next/image";
import { cn } from "@/lib/utils";

/** paints a figma svg with currentColor through a css mask */
export function AssetIcon({ name, className }: { name: string; className?: string }) {
  const mask = `url(/images/admin/${name}.svg)`;
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "auto",
        WebkitMaskSize: "auto",
      }}
    />
  );
}

export function AssetImage({
  name,
  width,
  height,
  className,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <Image
      src={`/images/admin/${name}.svg`}
      alt=""
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
