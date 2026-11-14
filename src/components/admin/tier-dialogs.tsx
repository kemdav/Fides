"use client";

import { useState, type FormEvent } from "react";
import {
  draftFromTier,
  emptyDraft,
  subscribedLabel,
  validateTier,
  type Tier,
  type TierDraft,
  type TierErrors,
} from "@/lib/admin/tiers";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { Icon } from "./icon";
import { TextField } from "./fields";
import { ConfirmationCard, FormCard } from "./verification-dialogs";

export function TierFormDialog({
  tier,
  tiers,
  busy = false,
  onClose,
  onSave,
  onDelete,
}: {
  tier?: Tier;
  tiers: Tier[];
  busy?: boolean;
  onClose: () => void;
  onSave: (draft: TierDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<TierDraft>(tier ? draftFromTier(tier) : emptyDraft);
  const [errors, setErrors] = useState<TierErrors>({});
  const editing = Boolean(tier);

  const update = (key: keyof TierDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateTier(draft, tiers, tier?.id);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    onSave(draft);
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormCard title={editing ? `Edit ${tier?.name}` : "Create subscription tier"} onClose={onClose}>
        <p className="text-sm leading-[21px] text-muted">
          {editing
            ? "Update monthly pricing and account limits for this tier."
            : "Define monthly pricing and account limits for a new tier."}
        </p>
        <TextField
          label="Tier Name"
          required
          value={draft.name}
          onChange={update("name")}
          error={errors.name}
          placeholder="e.g. Business"
          autoFocus
        />
        <TextField
          label="Monthly price (PHP)"
          required
          value={draft.price}
          onChange={update("price")}
          error={errors.price}
          inputMode="decimal"
          placeholder="1299"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Staff Limit (optional)"
            value={draft.staffLimit}
            onChange={update("staffLimit")}
            error={errors.staffLimit}
            inputMode="numeric"
            placeholder="Not limited"
          />
          <TextField
            label="Location Limit (optional)"
            value={draft.locationLimit}
            onChange={update("locationLimit")}
            error={errors.locationLimit}
            inputMode="numeric"
            placeholder="Not limited"
          />
        </div>
        <div className="flex items-center gap-[10px] rounded-lg bg-mist p-3 text-xs leading-[18px]">
          <Icon name="alert" className="size-[18px]" />
          <p>Confirm price and limits. This change is recorded in the activity log.</p>
        </div>
        <div className={cn("flex flex-wrap items-center gap-[10px]", editing ? "justify-between" : "justify-end")}>
          {editing ? (
            <AdminButton variant="danger" onClick={onDelete}>
              Delete tier
            </AdminButton>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton variant="outline" className="min-w-[100px]" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={busy} className="min-w-[101px]">
              {editing ? "Save changes" : "Create Tier"}
            </AdminButton>
          </div>
        </div>
      </FormCard>
    </form>
  );
}

export function DeleteTierDialog({
  tier,
  subscribed,
  busy = false,
  onCancel,
  onConfirm,
}: {
  tier: Tier;
  subscribed: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationCard icon="status-danger" title="Delete tier?">
      <p className="text-center text-sm leading-6 text-muted">
        Remove {tier.name} from the subscription catalog? It will no longer be available for new subscriptions.
        Existing tenant subscriptions will remain active ({subscribedLabel(subscribed)}).
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AdminButton variant="outline" size="md" className="min-w-[120px]" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" size="md" className="min-w-[147px]" onClick={onConfirm} disabled={busy} autoFocus>
          Delete tier
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}
