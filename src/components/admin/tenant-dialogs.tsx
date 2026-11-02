"use client";

import { useId, useState, type FormEvent } from "react";
import {
  accessOptions,
  planOptions,
  REASON_MAX,
  REASON_MIN,
  validReason,
  type Tenant,
  type TenantAccess,
} from "@/lib/admin/tenants";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { AssetIcon } from "./asset-icon";
import { Select } from "./select";
import { ConfirmationCard, FormCard } from "./verification-dialogs";

const selectLabel = "text-sm";

function Notice({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-[10px] rounded-lg bg-mist p-3 text-xs leading-[18px]">
      <AssetIcon name="icon-alert" className="size-[18px]" />
      <p>{children}</p>
    </div>
  );
}

function ReasonField({
  value,
  onChange,
  showError,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  showError: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const errorId = useId();
  const invalid = showError && !validReason(value);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold leading-6 opacity-80">
        Reason for change <span className="text-[13px] text-[#991b1b]">*</span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={REASON_MAX}
        rows={3}
        autoFocus={autoFocus}
        aria-invalid={invalid}
        aria-describedby={errorId}
        placeholder="Explain why this change is needed"
        className={cn(
          "w-full resize-y rounded-lg border bg-white px-4 py-3 text-base font-semibold leading-6 placeholder:font-semibold placeholder:text-ink/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 focus-visible:border-burnt",
          invalid ? "border-danger" : "border-glyph"
        )}
      />
      <p
        id={errorId}
        role={invalid ? "alert" : undefined}
        className={cn("text-xs leading-[18px]", invalid ? "text-danger" : "text-muted")}
      >
        {invalid
          ? `Enter a clear reason between ${REASON_MIN} and ${REASON_MAX} characters before saving.`
          : "Reason required · Stored with the change"}
      </p>
    </div>
  );
}

export type TenantChange = { plan: string; access: TenantAccess; reason: string };

export function TenantDialog({
  tenant,
  onClose,
  onSuspend,
  onSave,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSuspend: () => void;
  onSave: (change: TenantChange) => void;
}) {
  const [plan, setPlan] = useState(tenant.plan);
  const [access, setAccess] = useState<TenantAccess>(tenant.access);
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const reviewing = tenant.access === "suspended";
  const changed = plan !== tenant.plan || access !== tenant.access;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (reviewing && !validReason(reason)) {
      setShowError(true);
      return;
    }
    onSave({ plan, access, reason: reason.trim() });
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormCard title={tenant.name} onClose={onClose}>
        <p className="text-sm leading-[21px] text-muted">
          {tenant.reference} · {tenant.email}
        </p>
        <Select
          label="Subscription plan"
          labelClassName={selectLabel}
          value={plan}
          onChange={setPlan}
          options={[...planOptions]}
        />
        <Notice>
          {reviewing
            ? `$${tenant.price}/month currently. Account access changes apply immediately.`
            : `$${tenant.price}/month currently. Plan changes apply at the next renewal.`}
        </Notice>
        {reviewing ? (
          <>
            <Select
              label="Account access"
              labelClassName={selectLabel}
              value={access}
              onChange={setAccess}
              options={[...accessOptions]}
            />
            <ReasonField value={reason} onChange={setReason} showError={showError} />
          </>
        ) : null}
        <div className={cn("flex items-center gap-[10px]", reviewing ? "justify-end" : "justify-between")}>
          {reviewing ? (
            <AdminButton variant="outline" className="min-w-[100px]" onClick={onClose}>
              Cancel
            </AdminButton>
          ) : (
            <AdminButton variant="danger" className="min-w-[147px]" onClick={onSuspend}>
              Suspend Tenant
            </AdminButton>
          )}
          <AdminButton type="submit" disabled={!changed} className="min-w-[124px]">
            Save changes
          </AdminButton>
        </div>
      </FormCard>
    </form>
  );
}

export function SuspendDialog({
  tenant,
  onCancel,
  onConfirm,
}: {
  tenant: Tenant;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validReason(reason)) {
      setShowError(true);
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConfirmationCard icon="status-danger" title="Suspend tenant?">
        <p className="text-center text-sm leading-[21px] text-muted">
          Suspending {tenant.name} blocks their account access immediately. This decision will be recorded.
        </p>
        <ReasonField value={reason} onChange={setReason} showError={showError} autoFocus />
        <div className="flex items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" type="submit" className="min-w-[147px]">
            Suspend Tenant
          </AdminButton>
        </div>
      </ConfirmationCard>
    </form>
  );
}

export function SchedulePlanDialog({
  tenant,
  plan: initialPlan,
  onCancel,
  onConfirm,
}: {
  tenant: Tenant;
  plan: string;
  onCancel: () => void;
  onConfirm: (plan: string, reason: string) => void;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validReason(reason)) {
      setShowError(true);
      return;
    }
    onConfirm(plan, reason.trim());
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConfirmationCard icon="status-warning" title="Plan change at renewal">
        <p className="text-center text-sm leading-[21px] text-muted">
          {tenant.reference} · {tenant.email}
        </p>
        <Select
          label="Subscription plan"
          labelClassName={selectLabel}
          value={plan}
          onChange={setPlan}
          options={[...planOptions]}
        />
        <ReasonField value={reason} onChange={setReason} showError={showError} autoFocus />
        <Notice>New pricing starts at the next renewal. There is no immediate charge.</Notice>
        <div className="flex items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" className="min-w-[125px]">
            Schedule Plan
          </AdminButton>
        </div>
      </ConfirmationCard>
    </form>
  );
}
