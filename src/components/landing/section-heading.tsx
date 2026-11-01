import type { ReactNode } from "react";
import { Reveal } from "./reveal";

export function SectionHeading({
  title,
  children,
  reveal = false,
}: {
  title: string;
  children: ReactNode;
  reveal?: boolean;
}) {
  const heading = (
    <h2 className="font-display text-3xl leading-[normal] sm:text-5xl lg:text-[56px]">{title}</h2>
  );
  const subtitle = (
    <p className="mx-auto max-w-[789px] text-base/6 font-light sm:text-xl/7">{children}</p>
  );

  return (
    <div className="flex flex-col items-center gap-3 text-center lg:gap-4">
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
