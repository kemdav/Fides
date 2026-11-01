import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeading({
  title,
  children,
  reveal = false,
  align = "center",
}: {
  title: ReactNode;
  children: ReactNode;
  reveal?: boolean;
  align?: "center" | "left";
}) {
  const left = align === "left";

  const heading = (
    <h2 className="font-display text-3xl leading-[normal] sm:text-5xl lg:text-[56px]">{title}</h2>
  );
  const subtitle = (
    <p className={cn("max-w-[789px] text-base/6 font-light sm:text-xl/7", !left && "mx-auto")}>
      {children}
    </p>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:gap-4",
        left ? "items-start text-left" : "items-center text-center"
      )}
    >
      {reveal ? (
        <>
          <Reveal from="left">{heading}</Reveal>
          <Reveal from="left" delay={150}>
            {subtitle}
          </Reveal>
        </>
      ) : (
        <>
          {heading}
          {subtitle}
        </>
      )}
    </div>
  );
}
