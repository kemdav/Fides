import { AssetImage } from "../asset-icon";
import { InView } from "../in-view";
import { Surface } from "../primitives";

const roles = [
  { name: "Customers", count: 156, marker: "marker-customers" },
  { name: "Merchants", count: 24, marker: "marker-merchants" },
  { name: "Administrators", count: 2, marker: "marker-admins" },
];

const total = roles.reduce((sum, role) => sum + role.count, 0);
const share = (count: number) => ((count / total) * 100).toFixed(1);

export function UserDistribution() {
  const [customers] = roles;

  return (
    <Surface className="flex flex-col gap-4">
      <div className="flex h-[42px] items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold leading-[22px] text-body">User Distribution</h2>
          <p className="text-xs leading-[18px] text-subtle">Breakdown by account role</p>
        </div>
        <span className="rounded-md bg-mist px-2 py-[3px] text-[10px] leading-4 text-subtle">Sample data</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div
          role="img"
          aria-label={`${customers.name} make up ${share(customers.count)}% of ${total} users`}
          className="relative size-[168px] shrink-0 overflow-hidden"
        >
          <InView className="donut-reveal absolute inset-0">
            <AssetImage name="donut-customers" width={168} height={168} className="absolute inset-0 size-full" />
            <div className="absolute inset-[0.15%_52.89%_73.61%_11.16%]">
              <AssetImage name="donut-merchants" width={61} height={45} className="block size-full" />
            </div>
            <div className="absolute inset-[0_50.3%_87.43%_46.95%]">
              <AssetImage name="donut-admins" width={5} height={22} className="block size-full" />
            </div>
          </InView>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[30px] font-bold leading-9 text-body">{total}</p>
            <p className="text-[11px] leading-[17px] text-subtle">Total users</p>
          </div>
        </div>

        <ul className="flex min-w-[160px] flex-1 flex-col justify-center gap-3">
          {roles.map((role) => (
            <li key={role.name} className="flex h-11 items-center gap-[10px]">
              <AssetImage name={role.marker} width={8} height={8} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[13px] font-semibold leading-[19px] text-body">{role.name}</p>
                <p className="text-[11px] leading-[17px] text-subtle">{share(role.count)}% of users</p>
              </div>
              <p className="text-lg font-bold leading-6 text-body">{role.count}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-hairline pt-2 text-xs leading-[18px] text-subtle">
        Customers make up {share(customers.count)}% of all users.
      </p>
    </Surface>
  );
}
