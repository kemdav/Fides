import { InView } from "../in-view";
import { Surface } from "../primitives";

export type DistributionSlice = { name: string; count: number };

const palette = [
  { fill: "#cc5500", marker: "bg-burnt" },
  { fill: "#add8e6", marker: "bg-sky" },
  { fill: "#2c3a4b", marker: "bg-body" },
];

const RADIUS = 72;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function UserDistribution({ slices }: { slices: DistributionSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const share = (count: number) => (total === 0 ? "0.0" : ((count / total) * 100).toFixed(1));
  const leader = [...slices].sort((a, b) => b.count - a.count)[0];

  const lengths = slices.map((slice) => (total === 0 ? 0 : (slice.count / total) * CIRCUMFERENCE));
  const arcs = slices.map((slice, index) => ({
    slice,
    length: lengths[index],
    offset: lengths.slice(0, index).reduce((sum, value) => sum + value, 0),
    color: palette[index % palette.length],
  }));

  return (
    <Surface className="flex flex-col gap-4">
      <div className="flex h-[42px] items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold leading-[22px] text-body">Account Distribution</h2>
          <p className="text-xs leading-[18px] text-subtle">Breakdown by subscription plan</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div
          role="img"
          aria-label={leader && total > 0 ? `${leader.name} is the largest plan with ${share(leader.count)}% of ${total} accounts` : "No accounts yet"}
          className="relative size-[168px] shrink-0 overflow-hidden"
        >
          <InView className="donut-reveal absolute inset-0">
            <svg viewBox="0 0 168 168" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="84" cy="84" r={RADIUS} fill="none" stroke="#f4f6f9" strokeWidth={STROKE} />
              {arcs.map(({ slice, length, offset: start, color }) =>
                length > 0 ? (
                  <circle
                    key={slice.name}
                    cx="84"
                    cy="84"
                    r={RADIUS}
                    fill="none"
                    stroke={color.fill}
                    strokeWidth={STROKE}
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-start}
                  />
                ) : null
              )}
            </svg>
          </InView>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[30px] font-bold leading-9 text-body">{total}</p>
            <p className="text-[11px] leading-[17px] text-subtle">Total accounts</p>
          </div>
        </div>

        <ul className="flex min-w-[160px] flex-1 flex-col justify-center gap-3">
          {slices.map((slice, index) => (
            <li key={slice.name} className="flex h-11 items-center gap-[10px]">
              <span aria-hidden className={`size-2 rounded-full ${palette[index % palette.length].marker}`} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[13px] font-semibold leading-[19px] text-body">{slice.name}</p>
                <p className="text-[11px] leading-[17px] text-subtle">{share(slice.count)}% of accounts</p>
              </div>
              <p className="text-lg font-bold leading-6 text-body">{slice.count}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-hairline pt-2 text-xs leading-[18px] text-subtle">
        {leader && total > 0 ? `${leader.name} is the most common plan at ${share(leader.count)}% of accounts.` : "Plan data appears once accounts are approved."}
      </p>
    </Surface>
  );
}
