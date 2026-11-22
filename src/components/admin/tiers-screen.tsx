"use client";

import { useMemo, useState } from "react";
import { defaultTiers, pluralize, subscribedLabel, type Tier } from "@/lib/admin/tiers";
import { sampleTenants } from "@/lib/admin/tenants";
import { AdminButton } from "./admin-button";
import { AdminModal } from "./admin-modal";
import { Icon } from "./icon";
import { PageContent, PageHeading, Surface } from "./primitives";
import { DeleteTierDialog, TierFormDialog } from "./tier-dialogs";
import { ResultDialog } from "./verification-dialogs";

type DialogState =
  | { type: "create" }
  | { type: "edit"; id: string }
  | { type: "delete"; id: string }
  | { type: "result"; title: string; message: string };

function TierCard({ tier, subscribed, onEdit }: { tier: Tier; subscribed: number; onEdit: () => void }) {
  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-burnt bg-white p-5 shadow-[0_8px_12px_rgb(31_46_33/0.04)] sm:p-6">
      <p className="text-xs leading-[18px] text-muted">{tier.eyebrow}</p>
      <h2 className="text-lg font-semibold leading-[27px]">{tier.name}</h2>
      <p className="text-[32px] font-semibold leading-[47px]">${tier.price}</p>
      <p className="text-sm leading-[21px] text-muted">per month · USD</p>
      <p className="text-xs leading-[18px] text-muted">{subscribedLabel(subscribed)}</p>
      <ul className="flex flex-col gap-3.5">
        {[pluralize(tier.staffLimit, "staff member"), pluralize(tier.locationLimit, "location"), ...tier.features].map(
          (entitlement) => (
            <li key={entitlement} className="flex items-center gap-2 text-sm leading-[21px]">
              <Icon name="check" weight="bold" className="size-4 text-burnt" />
              {entitlement}
            </li>
          )
        )}
      </ul>
      <AdminButton
        variant="outline"
        size="xs"
        className="mt-auto w-fit"
        onClick={onEdit}
        aria-label={`Edit ${tier.name} tier`}
      >
        Edit tier
      </AdminButton>
    </article>
  );
}

function Comparison({ tiers }: { tiers: Tier[] }) {
  const rows = [
    { label: "Staff members", values: tiers.map((tier) => String(tier.staffLimit)) },
    { label: "Locations", values: tiers.map((tier) => String(tier.locationLimit)) },
    { label: "Online booking", values: tiers.map(() => "Included") },
    { label: "Monthly price", values: tiers.map((tier) => `$${tier.price}`) },
  ];
  const columns = { gridTemplateColumns: `minmax(120px,340px) repeat(${tiers.length}, minmax(0,1fr))` };

  return (
    <Surface className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold leading-[27px]">Compare entitlements</h2>
        <p className="text-xs leading-[18px] text-muted">Monthly plans · USD</p>
      </div>

      <div className="hidden md:block">
        <div style={columns} className="grid gap-5 rounded-lg bg-mist px-3.5 py-[9px] text-sm font-semibold leading-[21px]">
          <p>Feature</p>
          {tiers.map((tier) => (
            <p key={tier.id} className="truncate">
              {tier.name}
            </p>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.label} style={columns} className="grid gap-5 px-3.5 py-[9px] text-sm leading-[21px]">
            <p>{row.label}</p>
            {row.values.map((value, index) => (
              <p key={tiers[index].id}>{value}</p>
            ))}
          </div>
        ))}
      </div>

      <dl className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5 rounded-lg bg-mist/60 p-3">
            <dt className="text-sm font-semibold leading-[21px]">{row.label}</dt>
            {row.values.map((value, index) => (
              <dd key={tiers[index].id} className="flex justify-between gap-3 text-sm leading-[21px]">
                <span className="text-muted">{tiers[index].name}</span>
                <span>{value}</span>
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </Surface>
  );
}

export function TiersScreen() {
  const [tiers, setTiers] = useState(defaultTiers);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.price - b.price), [tiers]);
  const subscribers = (tier: Tier) => sampleTenants.filter((tenant) => tenant.plan === tier.name).length;
  const current = dialog && (dialog.type === "edit" || dialog.type === "delete") ? tiers.find((t) => t.id === dialog.id) : undefined;
  const close = () => setDialog(null);

  function save(tier: Tier) {
    const created = !tiers.some((item) => item.id === tier.id);
    setTiers((list) => (created ? [...list, tier] : list.map((item) => (item.id === tier.id ? tier : item))));
    setDialog({
      type: "result",
      title: created ? "Tier created" : "Tier saved",
      message: created ? `${tier.name} is now in the subscription catalog.` : `${tier.name} has been updated.`,
    });
  }

  return (
    <PageContent>
      <PageHeading
        eyebrow="PRODUCT & PRICING"
        title="Subscription tiers"
        description="Clear limits, predictable pricing, controlled changes."
        actions={
          <AdminButton variant="outline" onClick={() => setDialog({ type: "create" })}>
            Create tier
          </AdminButton>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            subscribed={subscribers(tier)}
            onEdit={() => setDialog({ type: "edit", id: tier.id })}
          />
        ))}
      </div>

      <Comparison tiers={sorted} />

      <AdminModal open={dialog !== null} onClose={close}>
        {dialog?.type === "create" ? <TierFormDialog tiers={tiers} onClose={close} onSave={save} /> : null}
        {dialog?.type === "edit" && current ? (
          <TierFormDialog
            key={current.id}
            tier={current}
            tiers={tiers}
            onClose={close}
            onSave={save}
            onDelete={() => setDialog({ type: "delete", id: current.id })}
          />
        ) : null}
        {dialog?.type === "delete" && current ? (
          <DeleteTierDialog
            tier={current}
            subscribed={subscribers(current)}
            onCancel={close}
            onConfirm={() => {
              setTiers((list) => list.filter((item) => item.id !== current.id));
              setDialog({ type: "result", title: "Tier deleted", message: `${current.name} has been removed from the catalog.` });
            }}
          />
        ) : null}
        {dialog?.type === "result" ? (
          <ResultDialog title={dialog.title} message={dialog.message} onDone={close} />
        ) : null}
      </AdminModal>
    </PageContent>
  );
}
