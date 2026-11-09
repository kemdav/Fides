"use client";

import { useId, useState, type FormEvent } from "react";
import {
  accessOptions,
  formatPrice,
  REASON_MAX,
  REASON_MIN,
  validReason,
  type PlanSummary,
  type Tenant,
  type TenantAccess,
} from "@/lib/admin/tenants";
import { pluralize } from "@/lib/admin/tiers";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { Icon } from "./icon";
import { Select } from "./select";
import { useTenants } from "./tenant-provider";
import { ConfirmationCard, FormCard } from "./verification-dialogs";

const selectLabel = "text-sm";

function Notice({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-[10px] rounded-lg bg-mist p-3 text-xs leading-[18px]">
      <Icon name="alert" className="size-[18px]" />
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

function usePlanOptions(): { value: string; label: string; detail: string }[] {
  const { plans } = useTenants();
  return plans.map((plan: PlanSummary) => ({ value: plan.code, label: plan.name, detail: `${formatPrice(plan.price)}/month` }));
}

export function TenantDialog({
  tenant,
  onClose,
  onSuspend,
  onSave,
  onResend,
  onDelete,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSuspend: () => void;
  onSave: (change: TenantChange) => void;
  onResend: () => void;
  onDelete: () => void;
}) {
  const planOptions = usePlanOptions();
  const { mailConfigured, busy } = useTenants();
  const [plan, setPlan] = useState(tenant.planCode);
  const [access, setAccess] = useState<TenantAccess>(tenant.access);
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const reviewing = tenant.access === "suspended";
  const changed = plan !== tenant.planCode || access !== tenant.access;

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
          options={planOptions}
        />
        <Notice>
          {reviewing
            ? `${formatPrice(tenant.price)}/month currently. Account access changes apply immediately.`
            : `${formatPrice(tenant.price)}/month currently. New pricing applies from the next billing date.`}
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
        <div className="flex flex-wrap items-center gap-[10px] text-xs leading-[18px]">
          <button
            type="button"
            onClick={onResend}
            disabled={busy || !mailConfigured}
            title={mailConfigured ? undefined : "Email delivery is not configured"}
            className="rounded font-semibold text-burnt underline underline-offset-2 hover:text-burnt-dark disabled:text-glyph disabled:no-underline"
          >
            Resend approval email
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded font-semibold text-danger underline underline-offset-2 hover:text-danger-dark"
          >
            Delete account
          </button>
        </div>
        <div className={cn("flex flex-wrap items-center gap-[10px]", reviewing ? "justify-end" : "justify-between")}>
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
        <div className="flex flex-wrap items-center justify-center gap-3">
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

export type BulkAccessMode = "suspend" | "reactivate";

export function BulkAccessDialog({
  mode,
  tenants,
  onCancel,
  onConfirm,
}: {
  mode: BulkAccessMode;
  tenants: Tenant[];
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const suspending = mode === "suspend";
  const count = tenants.length;
  const who = count <= 2 ? tenants.map((tenant) => tenant.name).join(" and ") : pluralize(count, "tenant");

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
      <ConfirmationCard
        icon={suspending ? "status-danger" : "status-info"}
        title={`${suspending ? "Suspend" : "Reactivate"} ${pluralize(count, "tenant")}?`}
      >
        <p className="text-center text-sm leading-[21px] text-muted">
          {suspending
            ? `Suspending ${who} blocks account access immediately. This decision will be recorded.`
            : `Reactivating ${who} restores account access immediately. This decision will be recorded.`}
        </p>
        <ReasonField value={reason} onChange={setReason} showError={showError} autoFocus />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant={suspending ? "danger" : "primary"} type="submit" className="min-w-[147px]">
            {suspending ? "Suspend" : "Reactivate"} {pluralize(count, "tenant")}
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
  const planOptions = usePlanOptions();
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
      <ConfirmationCard icon="status-warning" title="Change subscription plan">
        <p className="text-center text-sm leading-[21px] text-muted">
          {tenant.reference} · {tenant.email}
        </p>
        <Select
          label="Subscription plan"
          labelClassName={selectLabel}
          value={plan}
          onChange={setPlan}
          options={planOptions}
        />
        <ReasonField value={reason} onChange={setReason} showError={showError} autoFocus />
        <Notice>The new plan is recorded now and its pricing applies from the next billing date.</Notice>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" className="min-w-[125px]">
            Change Plan
          </AdminButton>
        </div>
      </ConfirmationCard>
    </form>
  );
}

export function DeleteTenantDialog({
  tenant,
  onCancel,
  onConfirm,
}: {
  tenant: Tenant;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { busy } = useTenants();
  return (
    <ConfirmationCard icon="status-danger" title="Delete account?">
      <p className="text-center text-sm leading-[21px] text-muted">
        Permanently delete {tenant.name} and the login for {tenant.email}. All of its registration records will be removed. This cannot be undone.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" className="min-w-[147px]" onClick={onConfirm} disabled={busy} autoFocus>
          Delete account
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}
