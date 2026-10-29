import Image from "next/image";

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
    <section id="about" className="bg-burnt/10 pt-12 lg:pt-[100px]">
      <div className="relative mx-auto max-w-[1440px] text-ink">
        <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center sm:px-8">
          <h2 className="font-display text-4xl leading-[normal] sm:text-5xl lg:text-[56px]">
            Streamlining Service Business Operations
          </h2>
          <p className="max-w-[789px] text-xl/7 font-light">
            Give your customers an easy way to discover your services and book
            appointments, while you keep track of your schedules, customers,
            staff, and daily operations.
          </p>
        </div>

        <div className="relative lg:-mt-[74px]">
          <div className="relative w-full overflow-hidden lg:aspect-[1440/1500]">
            <Image
              src="/images/landing/mockup.png"
              alt="A branded booking website for Luke Beauty Studio shown on a laptop"
              width={1200}
              height={896}
              sizes="(min-width: 1440px) 1702px, (min-width: 1024px) 118vw, 100vw"
              className="h-auto w-full lg:absolute lg:-left-[9.1%] lg:top-[2%] lg:w-[118.2%] lg:max-w-none"
            />
          </div>

          <div className="bg-gradient-to-b from-burnt/40 via-burnt/80 to-burnt px-4 py-10 sm:px-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:h-[485px] lg:px-0 lg:py-0">
            <div className="mx-auto grid max-w-[1002px] gap-8 text-white lg:h-full lg:grid-cols-3 lg:items-end lg:gap-0 lg:pb-[0px]">
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
        </div>
      </div>
    </section>
  );
}
