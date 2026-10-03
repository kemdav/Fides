import * as React from "react";
import { cn } from "@/lib/utils";

export type ContainerProps = React.HTMLAttributes<HTMLDivElement>;

/** Centered, width-constrained layout wrapper shared across surfaces. */
export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
