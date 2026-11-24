"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

export function StaffAvatar({ name, imageUrl, size = 40, colors }: {
  name: string;
  imageUrl?: string | null;
  size?: number;
  colors?: { background: string; foreground: string };
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span aria-hidden="true" style={colors ? { backgroundColor: colors.background, color: colors.foreground } : undefined} className={cn(
      "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-burnt/10 font-semibold text-burnt-dark",
      size === 56 ? "size-14 text-lg" : "size-10 text-sm",
    )}>
      {imageUrl && imageUrl !== failedUrl ? (
        <Image src={imageUrl} width={size} height={size} alt="" unoptimized
          className="absolute inset-0 size-full object-cover" onError={() => setFailedUrl(imageUrl)} />
      ) : getInitials(name)}
    </span>
  );
}
