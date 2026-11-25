"use client";

import * as React from "react";
import Link from "next/link";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { AdminLinkButton } from "@/components/admin/admin-button";
import { Surface } from "@/components/admin/primitives";
import {
  addCustomerNoteAction,
  cancelCustomerInviteAction,
  getCustomerProfileAction,
  sendCustomerInviteAction,
  setCustomerArchivedAction,
  updateCustomerAction,
} from "@/app/actions/customers";
import type {
  CustomerProfileWorkspaceData,
  CustomerVisitItem,
  UpdateCustomerInput,
} from "@/types/customers";
import {
  ConfirmActionModal,
  EditCustomerModal,
  StatusFeedbackModal,
} from "./customer-modals";
import {
  formatAppointmentStatusLabel,
  formatDateTimeManila,
  formatPesoCents,
  formatShortDate,
  getInitials,
} from "./customer-formatters";

function AppointmentStatusPill({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "confirmed"
      ? "bg-[#DCFCE7] text-[#15803D]"
      : status === "cancelled" || status === "no_show"
        ? "bg-[#FEE2E2] text-[#DC2626]"
        : status === "pending_approval"
          ? "bg-[#FEF3C7] text-[#B45309]"
          : "bg-[#E0F2FE] text-[#0369A1]";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {formatAppointmentStatusLabel(status)}
    </span>
  );
}

function PaymentStatusPill({
  status,
}: {
  status: CustomerVisitItem["paymentStatus"];
}) {
  const map: Record<
    CustomerVisitItem["paymentStatus"],
    { label: string; cls: string }
  > = {
    paid: { label: "Paid", cls: "bg-[#DCFCE7] text-[#15803D]" },
    unpaid: { label: "Unpaid", cls: "bg-[#FEE2E2] text-[#DC2626]" },
    pending: { label: "Pending", cls: "bg-[#FEF3C7] text-[#B45309]" },
    refunded: { label: "Refunded", cls: "bg-[#E2E8F0] text-[#475569]" },
    voided: { label: "Voided", cls: "bg-[#E2E8F0] text-[#475569]" },
    failed: { label: "Failed", cls: "bg-[#FEE2E2] text-[#DC2626]" },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

interface CustomerProfileViewProps {
  initialData: CustomerProfileWorkspaceData;
  basePath?: string;
}

export function CustomerProfileView({
  initialData,
  basePath = "",
}: CustomerProfileViewProps) {
  const [data, setData] =
    React.useState<CustomerProfileWorkspaceData>(initialData);
  const { meta, customer } = data;

  const [noteInput, setNoteInput] = React.useState("");
  const [postingNote, setPostingNote] = React.useState(false);
  const [showInviteHistory, setShowInviteHistory] = React.useState(false);
  const [showAllVisits, setShowAllVisits] = React.useState(false);

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showArchiveModal, setShowArchiveModal] = React.useState(false);
  const [showResendModal, setShowResendModal] = React.useState(false);
  const [showCancelInviteModal, setShowCancelInviteModal] =
    React.useState(false);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const [statusModal, setStatusModal] = React.useState<{
    title: string;
    description: string;
    inviteUrl?: string | null;
    deliveryWarning?: string | null;
  } | null>(null);

  const refreshProfile = React.useCallback(async () => {
    const res = await getCustomerProfileAction(meta.tenantId, customer.id);
    if (res.success && res.data) {
      setData(res.data);
    }
  }, [meta.tenantId, customer.id]);

  const handleEditCustomer = async (input: UpdateCustomerInput) => {
    const res = await updateCustomerAction(meta.tenantId, customer.id, input);
    if (!res.success) {
      return { ok: false, error: res.error, fieldErrors: res.fieldErrors };
    }
    setShowEditModal(false);
    await refreshProfile();
    setStatusModal({
      title: "Customer Changes Saved",
      description: "Contact details and account preferences were saved.",
    });
    return { ok: true };
  };

  const handleArchiveToggle = async (archive: boolean) => {
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await setCustomerArchivedAction(
        meta.tenantId,
        customer.id,
        archive,
      );
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setShowArchiveModal(false);
      await refreshProfile();
      setStatusModal({
        title: archive ? "Customer Archived" : "Customer Restored",
        description: archive
          ? "This record is hidden from the active registry. Visit history and notes remain preserved."
          : "This record is active in your customer registry again.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendInvite = async () => {
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await sendCustomerInviteAction(meta.tenantId, customer.id);
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setShowResendModal(false);
      await refreshProfile();
      setStatusModal({
        title: "Invitation Sent",
        description: "The invite link has been sent successfully.",
        inviteUrl: res.data?.inviteUrl ?? null,
        deliveryWarning: res.data?.deliveryWarning ?? null,
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelInvite = async () => {
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await cancelCustomerInviteAction(meta.tenantId, customer.id);
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setShowCancelInviteModal(false);
      await refreshProfile();
      setStatusModal({
        title: "Invitation Canceled",
        description: "The invite link has been canceled successfully.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || postingNote) return;
    setPostingNote(true);
    setErrorBanner(null);
    try {
      const res = await addCustomerNoteAction(
        meta.tenantId,
        customer.id,
        noteInput,
      );
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setNoteInput("");
      await refreshProfile();
    } finally {
      setPostingNote(false);
    }
  };

  const visibleVisits = showAllVisits
    ? customer.visits
    : customer.visits.slice(0, 5);

  const inviteBadge =
    customer.inviteStatus === "registered"
      ? { label: "Registered", cls: "bg-[#DCFCE7] text-[#15803D]" }
      : customer.inviteStatus === "invite_sent"
        ? { label: "Invite sent", cls: "bg-[#FEF3C7] text-[#B45309]" }
        : customer.inviteStatus === "invite_expired"
          ? { label: "Invite expired", cls: "bg-[#FEE2E2] text-[#DC2626]" }
          : { label: "Invite not sent", cls: "bg-[#EEF2FF] text-[#4338CA]" };

  const customersHref = `${basePath}/dashboard/customers`;
  const appointmentsHref = `${basePath}/dashboard/appointments`;

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-[#1E293B] lg:flex-row">
      <MerchantSidebar
        businessName={meta.businessName}
        userName={meta.userName}
        userEmail={meta.userEmail}
        userRole={meta.userRole}
        basePath={basePath}
      />

      <main className="flex w-full min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <div>
          <Link
            href={customersHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-burnt hover:text-burnt-dark"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to Customers</span>
          </Link>
        </div>

        {/* Page Heading */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] leading-[36px] text-[#1E293B] sm:text-[32px] sm:leading-[40px]">
              Customer Profile
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              View customer information, account access, notes, and visit
              history.
            </p>
          </div>
          <AdminLinkButton
            href={appointmentsHref}
            variant="outline-accent"
            size="sm"
            className="bg-white"
          >
            Book Appointment
          </AdminLinkButton>
        </header>

        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
          >
            {errorBanner}
          </div>
        )}

        {/* Top Summary Card */}
        <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F1EFE7] pb-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky/45 text-sm font-semibold text-ink">
                {getInitials(customer.fullName)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">
                  {customer.fullName}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {customer.accountType === "registered" ? (
                    <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
                      Registered account
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-[#FFEDD5] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                      Walk-in record
                    </span>
                  )}
                  {customer.archivedAt && (
                    <span className="inline-flex items-center rounded-full bg-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                      Archived
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="h-9 rounded-lg border border-[#D9DDE3] bg-white px-4 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC]"
              >
                Edit Customer
              </button>
              {customer.archivedAt ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleArchiveToggle(false)}
                  className="h-9 rounded-lg bg-[#15803D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#166534] disabled:opacity-50"
                >
                  Restore Customer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="h-9 rounded-lg bg-[#DC2626] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#B91C1C]"
                >
                  Archive Customer
                </button>
              )}
            </div>
          </div>

          {/* 5-Column Contact & Metrics Strip */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">
                Email address
              </p>
              <p
                className={`mt-1 text-sm font-medium ${
                  customer.email ? "text-[#1E293B]" : "italic text-[#94A3B8]"
                }`}
              >
                {customer.email ?? "No email added"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">
                Phone number
              </p>
              <p className="mt-1 text-sm font-medium text-[#1E293B]">
                {customer.phone ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">
                Last visit
              </p>
              <p className="mt-1 text-sm font-medium text-[#1E293B]">
                {formatShortDate(customer.lastVisitAt)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">
                Total visits
              </p>
              <p className="mt-1 text-xl font-bold text-[#1E293B]">
                {customer.totalVisits}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">
                Lifetime spend
              </p>
              <p className="mt-1 text-xl font-bold text-[#1E293B]">
                {formatPesoCents(customer.lifetimeSpendCents)}
              </p>
            </div>
          </div>
        </Surface>

        {/* Middle 2-Column Row: Account Status + Internal Notes */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Account Status Card */}
          <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6 lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-[#1E293B]">
                Account Status
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${inviteBadge.cls}`}
              >
                {inviteBadge.label}
              </span>
            </div>

            {customer.accountType === "registered" ? (
              <p className="mt-3 text-xs leading-relaxed text-[#475569]">
                This customer has a registered account. No invitation is needed.
              </p>
            ) : customer.activeInvite ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-[#334155]">
                  Sent {formatShortDate(customer.activeInvite.sentAt)}
                  {customer.activeInvite.invitedByName
                    ? ` by ${customer.activeInvite.invitedByName}`
                    : ""}
                  . Awaiting acceptance.
                </p>
                <p className="text-xs text-[#64748B]">
                  Invite email:{" "}
                  <span className="font-medium text-[#334155]">
                    {customer.activeInvite.email}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => setShowResendModal(true)}
                    className="h-9 rounded-lg border-2 border-burnt bg-white px-4 text-xs font-semibold text-burnt transition-colors hover:bg-burnt/10 disabled:opacity-50"
                  >
                    Resend Invite
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => setShowCancelInviteModal(true)}
                    className="h-9 rounded-lg border border-[#D9DDE3] bg-white px-4 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    Cancel Invite
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                  An invite connects the existing record after acceptance;
                  visits and notes stay together.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-[#334155]">
                  This walk-in record is not linked to a registered account.
                </p>
                <p className="text-xs text-[#64748B]">
                  Invite email:{" "}
                  {customer.email ? (
                    <span className="font-medium text-[#334155]">
                      {customer.email}
                    </span>
                  ) : (
                    <span className="italic text-[#94A3B8]">
                      Add an email address to send an invite.
                    </span>
                  )}
                </p>

                {customer.email ? (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={actionBusy || Boolean(customer.archivedAt)}
                      onClick={() => {
                        if (customer.invitations.length > 0) {
                          setShowResendModal(true);
                        } else {
                          void handleSendInvite();
                        }
                      }}
                      className="h-9 rounded-lg border-2 border-burnt bg-white px-4 text-xs font-semibold text-burnt transition-colors hover:bg-burnt/10 disabled:opacity-50"
                    >
                      {customer.invitations.length > 0
                        ? "Resend Invite"
                        : "Send Invite"}
                    </button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="h-9 rounded-lg border border-[#D9DDE3] bg-white px-4 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                    >
                      Add Email Address
                    </button>
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                  An invite connects the existing record after acceptance;
                  visits and notes stay together.
                </p>
              </div>
            )}

            {/* Expandable Invitation History */}
            <div className="mt-5 border-t border-[#F1EFE7] pt-3">
              <button
                type="button"
                onClick={() => setShowInviteHistory((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-[#1E293B]"
              >
                <span aria-hidden="true">✉</span>
                <span>Invitation History ({customer.invitations.length})</span>
              </button>

              {showInviteHistory && (
                <div className="mt-3 space-y-2">
                  {customer.invitations.length === 0 ? (
                    <p className="text-xs text-[#94A3B8]">
                      No invitations have been sent yet.
                    </p>
                  ) : (
                    customer.invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="rounded-lg border border-[#F1EFE7] bg-sky/20 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#1E293B]">
                            {inv.email}
                          </span>
                          <span className="rounded-full bg-[#ECEEF2] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#475569]">
                            {inv.effectiveStatus}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">
                          Sent {formatDateTimeManila(inv.sentAt)}
                          {inv.invitedByName
                            ? ` · by ${inv.invitedByName}`
                            : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Surface>

          {/* Internal Notes Card */}
          <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6 lg:col-span-7">
            <h3 className="text-base font-semibold text-[#1E293B]">
              Internal Notes
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Visible to staff only. Newest notes appear first.
            </p>

            <form onSubmit={handlePostNote} className="mt-4">
              <label
                htmlFor="internal-note-input"
                className="block text-xs font-semibold text-[#1E293B]"
              >
                Add a note for staff
              </label>
              <textarea
                id="internal-note-input"
                rows={2}
                maxLength={1000}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note (not visible to the customer)"
                className="mt-2 w-full resize-none rounded-lg border border-[#D9DDE3] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/20"
              />
              <div className="mt-2.5">
                <button
                  type="submit"
                  disabled={!noteInput.trim() || postingNote}
                  className="h-9 rounded-lg border border-[#D9DDE3] bg-white px-4 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {postingNote ? "Posting..." : "Post note"}
                </button>
              </div>
            </form>

            {customer.notes.length > 0 && (
              <div className="mt-5 divide-y divide-[#F1EFE7] border-t border-[#F1EFE7]">
                {customer.notes.map((note) => (
                  <div key={note.id} className="py-3.5">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#1E293B]">
                      {note.body}
                    </p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      {note.authorName} &middot;{" "}
                      {formatDateTimeManila(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </div>

        {/* Visit History Card */}
        <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1EFE7] px-6 py-4">
            <h3 className="text-base font-semibold text-[#1E293B]">
              Visit History
            </h3>
            {customer.visits.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllVisits((prev) => !prev)}
                className="h-8 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                {showAllVisits
                  ? "Show recent 5"
                  : `View all ${customer.visits.length} visits`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#F1EFE7] text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  <th className="px-6 py-3.5">Visit date</th>
                  <th className="px-4 py-3.5">Service</th>
                  <th className="px-4 py-3.5">Staff</th>
                  <th className="px-4 py-3.5">Appointment status</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Payment status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EA] text-xs">
                {visibleVisits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-[#64748B]"
                    >
                      No appointments recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  visibleVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-sky/20">
                      <td className="px-6 py-4 font-medium text-[#1E293B]">
                        {formatShortDate(visit.visitDate)}
                      </td>
                      <td className="px-4 py-4 text-[#334155]">
                        {visit.serviceName}
                      </td>
                      <td className="px-4 py-4 text-[#334155]">
                        {visit.staffName}
                      </td>
                      <td className="px-4 py-4">
                        <AppointmentStatusPill
                          status={visit.appointmentStatus}
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-[#1E293B]">
                        {formatPesoCents(visit.amountCents)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <PaymentStatusPill status={visit.paymentStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#F1EFE7] px-6 py-3 text-[11px] text-[#94A3B8]">
            Showing {visibleVisits.length} of {customer.visits.length} visits
            &middot; Includes completed, upcoming, no-show, and cancelled
            appointments.
          </div>
        </Surface>
      </main>

      {/* Modals */}
      <EditCustomerModal
        isOpen={showEditModal}
        initialValues={{
          fullName: customer.fullName,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          birthday: customer.birthday ?? "",
          marketingOptIn: customer.marketingOptIn,
          accountType: customer.accountType,
        }}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditCustomer}
      />

      <ConfirmActionModal
        isOpen={showArchiveModal}
        tone="danger"
        title="Archive Customer Record?"
        description="Hide this record from the active registry. Existing appointments, payments, and notes are kept. You can restore the record later."
        cancelLabel="Keep active"
        confirmLabel="Confirm Archive"
        confirmTone="danger"
        isLoading={actionBusy}
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={() => handleArchiveToggle(true)}
      />

      <ConfirmActionModal
        isOpen={showResendModal}
        tone="warning"
        title="Resend Invite Link?"
        description="Send a new account setup link to the saved email. The previous link will stop working. The customer record is retained."
        cancelLabel="Cancel"
        confirmLabel="Resend Invite"
        confirmTone="brand"
        isLoading={actionBusy}
        onCancel={() => setShowResendModal(false)}
        onConfirm={handleSendInvite}
      />

      <ConfirmActionModal
        isOpen={showCancelInviteModal}
        tone="warning"
        title="Cancel this Invitation?"
        description="The account setup link will stop working. This walk-in record, visit history, and internal notes will be kept."
        cancelLabel="Keep Invite"
        cancelTone="brand"
        confirmLabel="Cancel Invite"
        confirmTone="outline"
        isLoading={actionBusy}
        onCancel={() => setShowCancelInviteModal(false)}
        onConfirm={handleCancelInvite}
      />

      <StatusFeedbackModal
        isOpen={Boolean(statusModal)}
        title={statusModal?.title ?? ""}
        description={statusModal?.description ?? ""}
        inviteUrl={statusModal?.inviteUrl}
        deliveryWarning={statusModal?.deliveryWarning}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}
