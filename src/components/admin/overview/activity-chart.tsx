import { Icon } from "../icon";
import { AssetImage } from "../asset-icon";
import { InView } from "../in-view";
import { Surface } from "../primitives";

const week = [
  { day: "Mon", submitted: 12, reviewed: 9 },
  { day: "Tue", submitted: 16, reviewed: 12 },
  { day: "Wed", submitted: 14, reviewed: 10 },
  { day: "Thu", submitted: 18, reviewed: 14 },
  { day: "Fri", submitted: 20, reviewed: 16 },
  { day: "Sat", submitted: 15, reviewed: 11 },
  { day: "Sun", submitted: 10, reviewed: 7 },
];

const yAxis = [24, 18, 12, 6, 0];
const PX_PER_UNIT = 7;

function Bar({ value, className, delay }: { value: number; className: string; delay: number }) {
  return (
    <div className="flex h-[192px] w-full min-w-0 max-w-[30px] flex-col items-center justify-end gap-1">
      <span className="hidden text-[11px] leading-4 text-subtle sm:block">{value}</span>
      <div
        className={`chart-bar w-full rounded-[3px] ${className}`}
        style={{ "--h": `${value * PX_PER_UNIT}px`, "--delay": `${delay}ms` } as React.CSSProperties}
      />
    </div>
  );
}

export function ActivityChart() {
  return (
    <Surface className="flex flex-col gap-4 shadow-[0_1px_2px_rgb(80_55_20/0.05),0_4px_16px_rgb(80_55_20/0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-[10px]">
          <Icon name="calendar" className="size-[18px] text-glyph" />
          <h2 className="text-base font-semibold leading-[23px] text-body">Verification Activity · sample week</h2>
        </div>
        <ul className="flex gap-5">
          <li className="flex items-center gap-[7px] text-[11px] leading-4 text-subtle">
            <AssetImage name="dot-submitted" width={7} height={7} />
            Submitted
          </li>
          <li className="flex items-center gap-[7px] text-[11px] leading-4 text-subtle">
            <AssetImage name="dot-reviewed" width={7} height={7} />
            Reviewed
          </li>
        </ul>
      </div>

      <InView>
      <figure
        aria-label="Submitted and reviewed verifications for a sample week"
        className="flex h-[220px] gap-2 sm:gap-5"
      >
        <div
          aria-hidden
          className="flex h-[194px] w-7 shrink-0 flex-col items-center justify-between text-[11px] leading-4 text-subtle"
        >
          {yAxis.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-7">
          {week.map((entry, index) => (
            <div key={entry.day} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex w-full items-end justify-center gap-0.5 sm:gap-2">
                <Bar value={entry.submitted} className="bg-burnt" delay={index * 80} />
                <Bar value={entry.reviewed} className="bg-sky" delay={index * 80 + 120} />
              </div>
              <span className="text-[11px] leading-4 text-subtle">{entry.day}</span>
            </div>
          ))}
        </div>
      </figure>
      </InView>
    </Surface>
  );
}
