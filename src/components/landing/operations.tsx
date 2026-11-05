import { LaptopScene, SideSpheres } from "./laptop-scene";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

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
        <div className="relative z-10 px-4 sm:px-8">
          <SectionHeading reveal title="Streamlining Service Business Operations">
            Give your customers an easy way to discover your services and book
            appointments, while you keep track of your schedules, customers,
            staff, and daily operations.
          </SectionHeading>
        </div>
      </div>

      <Reveal from="rise" className="relative mt-[26px] min-[480px]:mt-[22px] sm:mt-[58px] lg:mt-[47px] h-[430px] min-[480px]:h-[540px] sm:h-[760px] lg:h-[1410px]">
        <LaptopScene />
        <SideSpheres />
      </Reveal>

      <div className="relative bg-gradient-to-b from-burnt/0 via-burnt/70 via-30% to-burnt to-60% px-4 pb-10 pt-28 lg:via-burnt/60 lg:via-45% lg:to-80% lg:py-0 sm:px-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[485px] lg:px-0 lg:py-0">
        <div className="mx-auto grid max-w-[1002px] gap-8 text-white lg:grid-cols-3 lg:items-start lg:gap-0 lg:pt-[139px]">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} from="up" delay={i * 120} className="border-l border-white pl-5 lg:h-[300px] lg:pt-[82px]">
              <h3 className="text-[32px]/9 font-semibold">{pillar.title}</h3>
              <p className="mt-4 max-w-[271px] text-lg/5 font-light lg:mt-[40px]">
                {pillar.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
