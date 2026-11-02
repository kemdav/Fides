import { AssetIcon, AssetImage } from "../asset-icon";
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

function Bar({ value, className }: { value: number; className: string }) {
  return (
    <div className="flex h-[192px] w-[30px] flex-col items-center justify-end gap-1">
      <span className="text-[11px] leading-4 text-subtle">{value}</span>
      <div className={`w-[30px] rounded-[3px] ${className}`} style={{ height: value * PX_PER_UNIT }} />
    </div>
  );
}

export function ActivityChart() {
  return (
    <Surface className="flex flex-col gap-4 shadow-[0_1px_2px_rgb(80_55_20/0.05),0_4px_16px_rgb(80_55_20/0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-[10px]">
          <AssetIcon name="mask-event" className="size-[18px] text-glyph" />
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

      <figure
        aria-label="Submitted and reviewed verifications for a sample week"
        className="flex h-[220px] gap-5 overflow-x-auto"
      >
        <div
          aria-hidden
          className="flex h-[194px] w-7 shrink-0 flex-col items-center justify-between text-[11px] leading-4 text-subtle"
        >
          {yAxis.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="flex min-w-[560px] flex-1 justify-between">
          {week.map((entry) => (
            <div key={entry.day} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-2">
                <Bar value={entry.submitted} className="bg-burnt" />
                <Bar value={entry.reviewed} className="bg-sky" />
              </div>
              <span className="text-[11px] leading-4 text-subtle">{entry.day}</span>
            </div>
          ))}
        </div>
      </figure>
    </Surface>
  );
}
