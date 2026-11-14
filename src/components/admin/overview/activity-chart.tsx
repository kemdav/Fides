import { Icon } from "../icon";
import { AssetImage } from "../asset-icon";
import { InView } from "../in-view";
import { Surface } from "../primitives";

export type WeekEntry = { day: string; submitted: number; reviewed: number };

const CHART_HEIGHT = 168;

function Bar({ value, className, delay, unit }: { value: number; className: string; delay: number; unit: number }) {
  return (
    <div className="flex h-[192px] w-full min-w-0 max-w-[30px] flex-col items-center justify-end gap-1">
      <span className="hidden text-[11px] leading-4 text-subtle sm:block">{value}</span>
      <div
        className={`chart-bar w-full rounded-[3px] ${className}`}
        style={{ "--h": `${value * unit}px`, "--delay": `${delay}ms` } as React.CSSProperties}
      />
    </div>
  );
}

export function ActivityChart({ week }: { week: WeekEntry[] }) {
  const peak = Math.max(4, ...week.flatMap((entry) => [entry.submitted, entry.reviewed]));
  const top = Math.ceil(peak / 4) * 4;
  const yAxis = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const unit = CHART_HEIGHT / top;
  return (
    <Surface className="flex flex-col gap-4 shadow-[0_1px_2px_rgb(80_55_20/0.05),0_4px_16px_rgb(80_55_20/0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-[10px]">
          <Icon name="calendar" className="size-[18px] text-glyph" />
          <h2 className="text-base font-semibold leading-[23px] text-body">Verification Activity · last 7 days</h2>
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
        aria-label="Submitted and reviewed verifications over the last 7 days"
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
                <Bar value={entry.submitted} className="bg-burnt" delay={index * 80} unit={unit} />
                <Bar value={entry.reviewed} className="bg-sky" delay={index * 80 + 120} unit={unit} />
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
