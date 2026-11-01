import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LaptopSvg } from "./laptop-svg";


// maps the screen's 880x570 layout box (the 344x223mm display) onto the projected glass in laptop-svg (1200x896 space)
const screenTransform =
  "matrix3d(0.719373782,0.0828095073,0,0.0000563884516,-0.0440140166,0.734369422,0,-0.0000124224816,0,0,1,0,303.494,127.618,0,1)";

const sphereTone =
  "bg-[radial-gradient(circle_at_30%_26%,#9bb0f5_0%,#5a74e0_34%,#3249bd_70%,#202f93_100%)] shadow-[inset_-14px_-22px_44px_rgb(18_28_110/0.5),0_30px_50px_-24px_rgb(9_16_29/0.4)]";

function Sphere({ className }: { className?: string }) {
  return <div aria-hidden className={cn("absolute rounded-full", sphereTone, className)} />;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const services = [
  {
    name: "Facial Treatment",
    price: "from ₱1,200",
    icon: <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />,
  },
  {
    name: "Hair Styling",
    price: "from ₱800",
    icon: (
      <>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
      </>
    ),
  },
  {
    name: "Body Massage",
    price: "from ₱1,500",
    icon: <path d="M12 20.5s-7.5-4.6-9.2-9.6C1.7 7.700 3.700 4.500 7 4.500c2 0 3.700 1 5 2.900 1.300-1.900 3-2.900 5-2.900 3.300 0 5.300 3.200 4.200 6.400-1.700 5-9.200 9.600-9.200 9.600z" />,
  },
  {
    name: "Skin Care",
    price: "from ₱600",
    icon: <path d="M12 3s6 6.200 6 10.500a6 6 0 11-12 0C6 9.200 12 3 12 3z" />,
  },
];

const slots = ["9:00", "10:30", "1:00", "2:30", "4:00", "5:30"];

function Screen() {
  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex h-14 shrink-0 items-center justify-between px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-burnt text-white">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
            </svg>
          </span>
          <span className="font-display text-[17px]">Luxe Beauty Studio</span>
        </div>
        <div className="flex items-center gap-6 text-[12px] font-semibold text-muted">
          <span className="text-burnt-dark">Home</span>
          <span>Services</span>
          <span>About</span>
          <span>Contact</span>
          <span className="rounded-full bg-burnt px-4 py-1.5 text-white">Book Now</span>
        </div>
      </div>

      <div className="grid h-[290px] shrink-0 grid-cols-[1.05fr_1fr] items-center gap-6 bg-powder px-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-burnt/10 px-3 py-1 text-[10.5px] font-semibold text-burnt-dark">
            <span className="size-1.5 rounded-full bg-success" />
            Open today · 9am – 7pm
          </span>
          <h3 className="mt-3 font-display text-[48px] leading-[1.04]">
            Look Good.
            <br />
            <span className="text-burnt">Feel Better.</span>
          </h3>
          <p className="mt-3 max-w-[300px] text-[13px]/5 font-light text-muted">
            Professional beauty and wellness services for your self-care journey.
          </p>
          <div className="mt-4 flex items-center gap-4 text-[12.5px] font-semibold">
            <span className="rounded-full bg-burnt px-5 py-2.5 text-white">
              Book an Appointment →
            </span>
            <span className="text-burnt-dark">View services</span>
          </div>
        </div>

        <div className="relative h-[225px] overflow-hidden rounded-[26px] bg-gradient-to-br from-sky/70 via-powder to-burnt/30">
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-burnt/20" />
          <div className="absolute -bottom-14 -left-8 size-48 rounded-full bg-sky/60" />
          <div className="absolute inset-x-7 top-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-[0_18px_40px_-18px_rgb(9_16_29/0.4)]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold">Pick a time</span>
              <span className="text-[10.5px] text-muted">Today</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
              {slots.map((slot, index) => (
                <span
                  key={slot}
                  className={cn(
                    "rounded-lg py-1.5",
                    index === 3 ? "bg-burnt text-white" : "bg-mist text-muted"
                  )}
                >
                  {slot}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-success-deep">
              <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm5 7.300l-6.500 6.500a1 1 0 01-1.400 0L4.200 11a1 1 0 011.400-1.400l2.200 2.200 5.800-5.800A1 1 0 0115 7.300z" />
              </svg>
              Slot confirmed instantly
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 pt-5">
        <p className="font-display text-[20px]">Our Services</p>
        <div className="mt-3 grid grid-cols-4 gap-4">
          {services.map((service) => (
            <div key={service.name} className="rounded-2xl bg-burnt/10 p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-burnt">
                <Icon>{service.icon}</Icon>
              </span>
              <p className="mt-3 text-[13px] font-semibold">{service.name}</p>
              <p className="text-[11px] text-muted">{service.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LaptopScene() {
  return (
    <div
      role="img"
      aria-label="A branded booking website for a beauty studio shown on a laptop"
      className="absolute left-1/2 top-0 h-[1410px] w-[1440px] origin-top -translate-x-1/2 scale-[0.4] min-[480px]:scale-[0.5] sm:scale-[0.7] lg:scale-100"
    >
      <Sphere className="-left-[30px] top-[860px] size-[1500px] lg:-left-[402px] lg:top-[918px] lg:size-[2224px] bg-[radial-gradient(circle_at_50%_6%,#7f96ef_0%,#4a64d6_30%,#2c3fae_60%,#1d2b86_100%)]" />

      <div className="absolute -left-[131px] -top-[60px] h-[896px] w-[1200px] origin-top-left scale-[1.418]">
        <LaptopSvg />
        <div
          className="absolute left-0 top-0 h-[570.5px] w-[880px] origin-top-left overflow-hidden rounded-[10px] bg-white"
          style={{ transform: screenTransform }}
        >
          <Screen />
          <div className="absolute left-1/2 top-0 h-[17px] w-[97px] -translate-x-1/2 rounded-b-lg bg-ink" />
        </div>
      </div>

      <Sphere className="left-[929px] top-[36px] size-[176px]" />
    </div>
  );
}

export function SideSpheres() {
  return (
    <>
      <Sphere className="-left-12 top-[190px] size-[130px] min-[480px]:top-[250px] min-[480px]:size-[170px] sm:top-[340px] sm:size-[260px] lg:-left-[150px] lg:top-[480px] lg:size-[445px]" />
      <Sphere className="-right-8 top-[300px] size-[100px] min-[480px]:top-[380px] min-[480px]:size-[140px] sm:top-[560px] sm:size-[200px] lg:-right-[100px] lg:top-[869px] lg:size-[340px]" />
    </>
  );
}
