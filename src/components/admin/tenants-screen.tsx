"use client";

import { useId, useMemo, useState } from "react";
import { formatNextBilling, formatPrice, isRenewingSoon, type PlanSummary, type Tenant } from "@/lib/admin/tenants";
import { pluralize } from "@/lib/admin/tiers";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { Icon } from "./icon";
import { MetricCard } from "./metric-card";
import { Checkbox, PageContent, PageHeading, StatusPill, Surface } from "./primitives";
import { Select } from "./select";
import { TenantsProvider, useTenants, type PendingAccount } from "./tenant-provider";

export type StatusFilter = "all" | "active" | "suspended" | "renewing";

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All tenants" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "renewing", label: "Renewing within 7 days" },
];

const rowGrid =
  "md:grid-cols-[18px_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_132px] lg:grid-cols-[18px_40px_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_132px]";

function matchesFilter(tenant: Tenant, filter: StatusFilter, now: number) {
  if (filter === "all") return true;
  if (filter === "renewing") return isRenewingSoon(tenant, now);
  return tenant.access === filter;
}

function subscription(tenant: Tenant) {
  return `${tenant.plan} · ${formatPrice(tenant.price)}/mo`;
}

function StatusBadge({ tenant }: { tenant: Tenant }) {
  return (
    <StatusPill
      tone={tenant.access === "active" ? "success" : "danger"}
      className="rounded-full px-2.5 py-0.5 text-[11px] leading-4 text-body"
    >
      {tenant.access === "active" ? "Active" : "Suspended"}
    </StatusPill>
  );
}

function RowActions({ tenant }: { tenant: Tenant }) {
  const { openTenant, openDelete, sendReminders, now } = useTenants();
  const due = isRenewingSoon(tenant, now);
  const iconButton =
    "flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label={`Send billing reminder to ${tenant.name}`}
        title={due ? undefined : "No renewal due within 7 days"}
        disabled={!due}
        onClick={() => sendReminders([tenant.id])}
        className={cn(iconButton, "text-burnt disabled:text-glyph disabled:opacity-50 disabled:hover:bg-transparent")}
      >
        <Icon name="bell" weight="fill" className="size-6" />
      </button>
      <button
        type="button"
        aria-label={`Manage ${tenant.name}`}
        onClick={() => openTenant(tenant.id)}
        className={cn(iconButton, "text-glyph")}
      >
        <Icon name="more" weight="fill" className="size-6" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${tenant.name}`}
        title="Delete account"
        onClick={() => openDelete(tenant.id)}
        className={cn(iconButton, "text-danger")}
      >
        <Icon name="trash" className="size-5" />
      </button>
    </div>
  );
}

function MobileActions({ tenant }: { tenant: Tenant }) {
  const { openTenant, openDelete, sendReminders, now } = useTenants();
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
      <AdminButton
        variant="outline"
        size="xs"
        disabled={!isRenewingSoon(tenant, now)}
        onClick={() => sendReminders([tenant.id])}
      >
        Send reminder
      </AdminButton>
      <AdminButton variant="outline" size="xs" onClick={() => openTenant(tenant.id)}>
        Manage
      </AdminButton>
      <AdminButton variant="danger" size="xs" onClick={() => openDelete(tenant.id)}>
        Delete
      </AdminButton>
    </div>
  );
}

function TenantsContent({ initialFilter }: { initialFilter: StatusFilter }) {
  const { tenants, pending, openPending, showResult, openBulkAccess, sendReminders, now } = useTenants();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [selected, setSelected] = useState<string[]>([]);
  const searchId = useId();

  const active = tenants.filter((tenant) => tenant.access === "active").length;
  const renewing = tenants.filter((tenant) => isRenewingSoon(tenant, now)).length;
  const suspended = tenants.filter((tenant) => tenant.access === "suspended").length;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tenants.filter(
      (tenant) =>
        matchesFilter(tenant, filter, now) &&
        (!needle ||
          tenant.name.toLowerCase().includes(needle) ||
          tenant.reference.toLowerCase().includes(needle) ||
          tenant.owner.toLowerCase().includes(needle))
    );
  }, [tenants, query, filter, now]);

  const selectedRows = rows.filter((tenant) => selected.includes(tenant.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  function toggleAll(checked: boolean) {
    const visible = rows.map((tenant) => tenant.id);
    setSelected((current) => (checked ? [...new Set([...current, ...visible])] : current.filter((id) => !visible.includes(id))));
  }

  const dueSelected = selectedRows.filter((tenant) => isRenewingSoon(tenant, now));
  const activeSelected = selectedRows.filter((tenant) => tenant.access === "active");
  const suspendedSelected = selectedRows.filter((tenant) => tenant.access === "suspended");
  const clearSelection = () => setSelected([]);

  function toggle(next: StatusFilter) {
    setFilter((current) => (current === next ? "all" : next));
  }

  function exportTenants() {
    const header = ["Business", "Account ID", "Owner", "Email", "Plan", "Monthly price (PHP)", "Next billing", "Status"];
    const exported = selectedRows.length ? selectedRows : rows;
    const lines = exported.map((tenant) =>
      [tenant.name, tenant.reference, tenant.owner, tenant.email, tenant.plan, tenant.price, formatNextBilling(tenant), tenant.access]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fides-tenants.csv";
    link.click();
    URL.revokeObjectURL(url);
    showResult("Export requested", "The tenant list has been exported as a CSV file.");
  }

  return (
    <PageContent>
      <PageHeading
        eyebrow="ACCOUNTS & BILLING"
        title="Tenants & subscriptions"
        description="Manage account access and upcoming renewals."
        actions={
          <AdminButton variant="outline" onClick={exportTenants} disabled={rows.length === 0}>
            {selectedRows.length ? `Export ${selectedRows.length} selected` : "Export tenants"}
          </AdminButton>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
        <MetricCard
          featured
          label="Active accounts"
          value={active}
          caption="Verified and available for booking"
          icon="users"
          progress={65}
          pressed={filter === "active"}
          onClick={() => toggle("active")}
        />
        <MetricCard
          label="Renewing within 7 days"
          value={renewing}
          caption="Next billing cycle approaching"
          icon="card"
          progress={65}
          pressed={filter === "renewing"}
          onClick={() => toggle("renewing")}
        />
        <MetricCard
          label="Suspended accounts"
          value={suspended}
          caption="Account access is restricted"
          icon="lock"
          progress={65}
          pressed={filter === "suspended"}
          onClick={() => toggle("suspended")}
        />
      </div>

      {pending.length > 0 ? (
        <Surface className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Icon name="verified" className="size-[18px] text-glyph" />
            <h2 className="text-base font-semibold leading-[23px] text-body">Pending approval</h2>
            <span className="rounded-full bg-warn-bg px-2.5 py-1 text-[11px] font-semibold leading-4 text-warn-fg">{pending.length}</span>
          </div>
          <ul className="flex flex-col">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 border-t border-hairline py-3 first:border-t-0 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-5">{item.business}</p>
                  <p className="truncate text-xs leading-[18px] text-muted">
                    {item.owner} · {item.email} · {item.plan} · {item.reference}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminButton size="xs" onClick={() => openPending("approve", item.id)}>
                    Approve
                  </AdminButton>
                  <AdminButton variant="outline" size="xs" onClick={() => openPending("reject", item.id)}>
                    Reject
                  </AdminButton>
                  <AdminButton variant="danger" size="xs" onClick={() => openPending("delete", item.id)}>
                    Delete
                  </AdminButton>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <Surface className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon name="users" className="size-[18px] text-glyph" />
            <h2 className="text-base font-semibold leading-[23px] text-body">All tenants</h2>
            <span className="rounded-full bg-wash px-2.5 py-1 text-[11px] font-semibold leading-4 text-body">
              {pluralize(rows.length, "tenant")}
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="relative min-w-[200px] flex-1 sm:w-[320px] sm:flex-none">
              <label htmlFor={searchId} className="sr-only">
                Search tenant or account ID
              </label>
              <Icon
                name="search"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-glyph"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tenant or account ID"
                className="h-11 w-full rounded-lg border border-hairline bg-white pl-11 pr-4 text-sm text-body transition-colors placeholder:text-subtle hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
              />
            </div>
            <Select
              label="Filter by status"
              labelClassName="sr-only"
              value={filter}
              onChange={setFilter}
              options={filterOptions}
              className="w-full sm:w-[220px]"
            />
          </div>
        </div>

        {selectedRows.length > 0 ? (
          <div
            role="region"
            aria-label="Bulk actions"
            className="flex flex-col gap-3 rounded-lg bg-selected px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4"
          >
            <div className="flex items-center justify-between gap-3 lg:contents">
              <p aria-live="polite" className="text-sm font-semibold leading-5">
                {selectedRows.length} selected
              </p>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded text-sm font-semibold text-burnt underline underline-offset-2 hover:text-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 lg:order-last lg:ml-auto"
              >
                Clear selection
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap lg:items-center">
              <AdminButton
                variant="outline"
                size="xs"
                className="w-full lg:w-auto"
                disabled={dueSelected.length === 0}
                onClick={() => {
                  sendReminders(dueSelected.map((tenant) => tenant.id));
                  clearSelection();
                }}
              >
                Send reminder ({dueSelected.length})
              </AdminButton>
              <AdminButton
                variant="outline"
                size="xs"
                className="w-full lg:w-auto"
                disabled={activeSelected.length === 0}
                onClick={() => openBulkAccess("suspend", activeSelected.map((tenant) => tenant.id), clearSelection)}
              >
                Suspend ({activeSelected.length})
              </AdminButton>
              <AdminButton
                variant="outline"
                size="xs"
                className="w-full lg:w-auto"
                disabled={suspendedSelected.length === 0}
                onClick={() => openBulkAccess("reactivate", suspendedSelected.map((tenant) => tenant.id), clearSelection)}
              >
                Reactivate ({suspendedSelected.length})
              </AdminButton>
            </div>
          </div>
        ) : null}

        <div className={cn("hidden border-b border-hairline px-1 text-[11px] leading-4 text-subtle md:grid md:items-center md:gap-4", rowGrid)}>
          <span className="py-3">
            <Checkbox
              checked={allSelected}
              onChange={toggleAll}
              label={<span className="sr-only">Select all tenants</span>}
              className="gap-0"
            />
          </span>
          <span className="hidden py-3 lg:block">No.</span>
          <span className="py-3">Business</span>
          <span className="hidden py-3 lg:block">Account owner</span>
          <span className="py-3">Subscription</span>
          <span className="py-3">Next billing</span>
          <span className="py-3">Status</span>
          <span className="py-3 text-right">Action</span>
        </div>

        {rows.length > 0 ? (
          <div className="border-b border-hairline pb-3 md:hidden">
            <Checkbox
              checked={allSelected}
              onChange={toggleAll}
              label={<span className="text-sm font-semibold">Select all</span>}
            />
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p role="status" className="py-6 text-sm text-muted">
            {tenants.length === 0 ? "No approved business accounts yet. Approved applications appear here." : "No tenants match your filters."}
          </p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((tenant, index) => (
              <li key={tenant.id} className="border-b border-hairline last:border-b-0 md:border-b-0 md:border-t md:first:border-t-0">
                <div className={cn("hidden px-1 text-sm leading-5 text-body md:grid md:min-h-[60px] md:items-center md:gap-4", rowGrid)}>
                  <Checkbox
                    checked={selected.includes(tenant.id)}
                    onChange={(checked) => toggleRow(tenant.id, checked)}
                    label={<span className="sr-only">Select {tenant.name}</span>}
                    className="gap-0"
                  />
                  <span className="hidden lg:block">{String(index + 1).padStart(2, "0")}</span>
                  <span className="truncate font-semibold">{tenant.name}</span>
                  <span className="hidden truncate lg:block">{tenant.owner}</span>
                  <span className="truncate">{subscription(tenant)}</span>
                  <span>{formatNextBilling(tenant)}</span>
                  <span>
                    <StatusBadge tenant={tenant} />
                  </span>
                  <RowActions tenant={tenant} />
                </div>

                <div className="flex flex-col gap-3 py-4 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        checked={selected.includes(tenant.id)}
                        onChange={(checked) => toggleRow(tenant.id, checked)}
                        label={<span className="sr-only">Select {tenant.name}</span>}
                        className="mt-0.5 gap-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-5">{tenant.name}</p>
                        <p className="text-xs leading-[18px] text-muted">{tenant.reference}</p>
                      </div>
                    </div>
                    <StatusBadge tenant={tenant} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-5">
                    <div>
                      <dt className="text-xs leading-[18px] text-subtle">Account owner</dt>
                      <dd>{tenant.owner}</dd>
                    </div>
                    <div>
                      <dt className="text-xs leading-[18px] text-subtle">Next billing</dt>
                      <dd>{formatNextBilling(tenant)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs leading-[18px] text-subtle">Subscription</dt>
                      <dd>{subscription(tenant)}</dd>
                    </div>
                  </dl>
                  <MobileActions tenant={tenant} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] leading-4 text-subtle">
          Showing {rows.length} of {tenants.length} tenants · PHP · Monthly billing
        </p>
      </Surface>
    </PageContent>
  );
}

export function TenantsScreen({
  initialFilter = "all",
  tenants,
  pending = [],
  plans,
  now,
  mailConfigured,
}: {
  initialFilter?: StatusFilter;
  tenants: Tenant[];
  pending?: PendingAccount[];
  plans: PlanSummary[];
  now: number;
  mailConfigured: boolean;
}) {
  return (
    <TenantsProvider tenants={tenants} pending={pending} plans={plans} now={now} mailConfigured={mailConfigured}>
      <TenantsContent initialFilter={initialFilter} />
    </TenantsProvider>
  );
}
