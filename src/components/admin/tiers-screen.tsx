"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { removePlanAction, savePlanAction } from "@/app/(admin)/admin/actions";
import { formatPrice } from "@/lib/admin/tenants";
import { pluralize, subscribedLabel, type Tier, type TierDraft } from "@/lib/admin/tiers";
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
  | { type: "result"; title: string; message: string; failed?: boolean };

function TierCard({ tier, onEdit }: { tier: Tier; onEdit: () => void }) {
  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-burnt bg-white p-5 shadow-[0_8px_12px_rgb(31_46_33/0.04)] sm:p-6">
      <p className="text-xs leading-[18px] text-muted">{tier.eyebrow}</p>
      <h2 className="text-lg font-semibold leading-[27px]">{tier.name}</h2>
      <p className="text-[32px] font-semibold leading-[47px]">{formatPrice(tier.price)}</p>
      <p className="text-sm leading-[21px] text-muted">per month · PHP</p>
      <p className="text-xs leading-[18px] text-muted">{subscribedLabel(tier.subscribed)}</p>
      <ul className="flex flex-col gap-3.5">
        {[
          ...(tier.staffLimit === null ? [] : [pluralize(tier.staffLimit, "staff member")]),
          ...(tier.locationLimit === null ? [] : [pluralize(tier.locationLimit, "location")]),
          ...tier.features,
        ].map(
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
    { label: "Staff members", values: tiers.map((tier) => (tier.staffLimit === null ? "Not limited" : String(tier.staffLimit))) },
    { label: "Locations", values: tiers.map((tier) => (tier.locationLimit === null ? "Not limited" : String(tier.locationLimit))) },
    { label: "Feature count", values: tiers.map((tier) => String(tier.features.length)) },
    { label: "Monthly price", values: tiers.map((tier) => formatPrice(tier.price)) },
  ];
  const columns = { gridTemplateColumns: `minmax(120px,340px) repeat(${tiers.length}, minmax(0,1fr))` };

  return (
    <Surface className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold leading-[27px]">Compare entitlements</h2>
        <p className="text-xs leading-[18px] text-muted">Monthly plans · PHP</p>
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

export function TiersScreen({ tiers }: { tiers: Tier[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.price - b.price), [tiers]);
  const current = dialog && (dialog.type === "edit" || dialog.type === "delete") ? tiers.find((t) => t.id === dialog.id) : undefined;
  const close = () => setDialog(null);

  function report(result: { ok: boolean; message?: string; error?: string }, title: string) {
    if (result.ok) {
      setDialog({ type: "result", title, message: result.message ?? "" });
      router.refresh();
    } else {
      setDialog({ type: "result", title: "Action failed", message: result.error ?? "Something went wrong.", failed: true });
    }
  }

  function save(draft: TierDraft, id?: string) {
    startTransition(async () => {
      const result = await savePlanAction({
        code: id,
        name: draft.name.trim(),
        price: Number(draft.price),
        staffLimit: draft.staffLimit.trim() ? Number(draft.staffLimit) : null,
        locationLimit: draft.locationLimit.trim() ? Number(draft.locationLimit) : null,
      });
      report(result, id ? "Tier saved" : "Tier created");
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
            onEdit={() => setDialog({ type: "edit", id: tier.id })}
          />
        ))}
      </div>

      {sorted.length > 0 ? <Comparison tiers={sorted} /> : null}

      <AdminModal open={dialog !== null} onClose={close}>
        {dialog?.type === "create" ? <TierFormDialog tiers={tiers} busy={busy} onClose={close} onSave={(draft) => save(draft)} /> : null}
        {dialog?.type === "edit" && current ? (
          <TierFormDialog
            key={current.id}
            tier={current}
            tiers={tiers}
            busy={busy}
            onClose={close}
            onSave={(draft) => save(draft, current.id)}
            onDelete={() => setDialog({ type: "delete", id: current.id })}
          />
        ) : null}
        {dialog?.type === "delete" && current ? (
          <DeleteTierDialog
            tier={current}
            subscribed={current.subscribed}
            busy={busy}
            onCancel={close}
            onConfirm={() => startTransition(async () => report(await removePlanAction(current.id), "Tier deleted"))}
          />
        ) : null}
        {dialog?.type === "result" ? (
          <ResultDialog title={dialog.title} message={dialog.message} failed={dialog.failed} onDone={close} />
        ) : null}
      </AdminModal>
    </PageContent>
  );
}
