import Image from "next/image";

/*
 * the figma "features stack" tucks five more feature cards behind the featured
 * one (online booking, appointment, staff and customer management). their
 * content is hidden in the static design, so only the stacked layers render.
 */
const tuckedLayers = [
  "inset-x-[10%] top-0",
  "inset-x-[8%] top-3 lg:top-6",
  "inset-x-[6%] top-6 lg:top-12",
  "inset-x-[4%] top-9 lg:top-[72px]",
  "inset-x-[2%] top-12 lg:top-24",
];

export function Features() {
  return (
    <section id="features" className="bg-powder px-4 py-12 sm:px-8 lg:pb-[122px] lg:pt-[50px]">
      <div className="mx-auto max-w-[1280px] text-center text-ink">
        <h2 className="font-display text-4xl leading-[normal] sm:text-5xl lg:text-[56px]">
          Everything You Need to Run Your Business
        </h2>
        <p className="mx-auto mt-4 max-w-[789px] text-xl/7 font-light">
          From accepting bookings to managing your daily operations, Fides keeps
          your business organized in one place.
        </p>

        <div className="relative mx-auto mt-10 max-w-[1000px] pt-[60px] text-left lg:mt-[83px] lg:pt-[120px]">
          {tuckedLayers.map((position) => (
            <div
              key={position}
              aria-hidden
              className={`absolute h-[216px] rounded-3xl bg-burnt/10 ${position}`}
            />
          ))}

          <article className="relative flex flex-col gap-6 rounded-3xl bg-burnt p-6 text-white sm:flex-row sm:gap-12 sm:p-12">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-powder lg:size-[120px]">
              <Image
                src="/images/landing/icon-website.svg"
                alt=""
                width={55.35}
                height={48.35}
                aria-hidden
              />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <h3 className="text-[32px]/9 font-semibold">Branded Business Website</h3>
              <p className="text-lg/5 font-light">
                Give your business a professional online presence where customers
                can discover and book your services.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
