import { LaptopScene, SideSpheres } from "./laptop-scene";
import { Reveal } from "./reveal";

const pillars = [
  {
    title: "Efficiency",
    description: "Streamline booking and appointment management for your business.",
  },
  {
    title: "Integrated",
    description:
      "Connect customer bookings, schedules, and business operations in one platform.",
  },
  {
    title: "Organized",
    description:
      "Keep appointments, customer information, and daily activities structured and accessible.",
  },
];

export function Operations() {
  return (
    <section id="about" className="relative scroll-mt-16 lg:scroll-mt-[88px] overflow-hidden bg-burnt/10 pt-12 lg:pt-[100px]">
      <div className="mx-auto max-w-[1440px] text-ink">
        <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center sm:px-8">
          <Reveal from="left">
            <h2 className="font-display text-4xl leading-[normal] sm:text-5xl lg:text-[56px]">
              Streamlining Service Business Operations
            </h2>
          </Reveal>
          <Reveal from="left" delay={150}>
            <p className="max-w-[789px] text-xl/7 font-light">
              Give your customers an easy way to discover your services and book
              appointments, while you keep track of your schedules, customers,
              staff, and daily operations.
            </p>
          </Reveal>
        </div>
      </div>

      {/* laptop and spheres rise together as one piece */}
      <Reveal from="rise" className="relative mt-4 h-[430px] min-[480px]:h-[540px] sm:h-[760px] lg:h-[1410px]">
        <LaptopScene />
        <SideSpheres />
      </Reveal>

      {/* full-bleed fade so the band never shows hard edges on wide screens */}
      <div className="bg-gradient-to-b from-burnt/0 via-burnt/60 via-45% to-burnt to-80% px-4 py-10 sm:px-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[485px] lg:px-0 lg:py-0">
        <div className="mx-auto grid max-w-[1002px] gap-8 text-white lg:grid-cols-3 lg:items-start lg:gap-0 lg:pt-[139px]">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="border-l border-white pl-5 lg:h-[300px] lg:pt-[82px]"
            >
              <h3 className="text-[32px]/9 font-semibold">{pillar.title}</h3>
              <p className="mt-4 max-w-[271px] text-lg/5 font-light lg:mt-[40px]">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
