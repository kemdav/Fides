"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { Surface } from "@/components/admin/primitives";
import {
  cancelCustomerInviteAction,
  createCustomerAction,
  getCustomerRegistryAction,
  sendCustomerInviteAction,
  setCustomerArchivedAction,
  updateCustomerAction,
} from "@/app/actions/customers";
import type {
  CreateCustomerInput,
  CustomerFilterOption,
  CustomerRegistryItem,
  CustomerRegistryWorkspaceData,
  UpdateCustomerInput,
} from "@/types/customers";
import {
  AddCustomerModal,
  ConfirmActionModal,
  EditCustomerModal,
  StatusFeedbackModal,
} from "./customer-modals";
import { formatPesoCents, formatShortDate } from "./customer-formatters";

const PAGE_SIZE = 10;

function AccountBadges({ item }: { item: CustomerRegistryItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.accountType === "registered" ? (
        <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
          Registered account
        </span>
      ) : (
        <>
          <span className="inline-flex items-center rounded-full bg-[#FFEDD5] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
            Walk-in record
          </span>
          {item.inviteStatus === "invite_sent" && (
            <span className="inline-flex items-center rounded-full border border-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309]">
              Invite sent
            </span>
          )}
          {item.inviteStatus === "invite_not_sent" && (
            <span className="inline-flex items-center rounded-full border border-[#6366F1] bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#4338CA]">
              Invite not sent
            </span>
          )}
          {item.inviteStatus === "invite_expired" && (
            <span className="inline-flex items-center rounded-full border border-[#EF4444] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
              Invite expired
            </span>
          )}
        </>
      )}

      {item.archivedAt && (
        <span className="inline-flex items-center rounded-full bg-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
          Archived
        </span>
      )}
    </div>
  );
}

interface CustomersRegistryViewProps {
  initialData: CustomerRegistryWorkspaceData;
  basePath?: string;
}

export function CustomersRegistryView({
  initialData,
  basePath = "",
}: CustomersRegistryViewProps) {
  const router = useRouter();
  const [data, setData] =
    React.useState<CustomerRegistryWorkspaceData>(initialData);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<CustomerFilterOption>("all");
  const [page, setPage] = React.useState(1);

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingCustomer, setEditingCustomer] =
    React.useState<CustomerRegistryItem | null>(null);
  const [archivingCustomer, setArchivingCustomer] =
    React.useState<CustomerRegistryItem | null>(null);
  const [resendingCustomer, setResendingCustomer] =
    React.useState<CustomerRegistryItem | null>(null);
  const [cancelingCustomer, setCancelingCustomer] =
    React.useState<CustomerRegistryItem | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const [statusModal, setStatusModal] = React.useState<{
    title: string;
    description: string;
    inviteUrl?: string | null;
    deliveryWarning?: string | null;
  } | null>(null);

  const refreshRegistry = React.useCallback(async () => {
    const res = await getCustomerRegistryAction(data.meta.tenantId);
    if (res.success && res.data) {
      setData(res.data);
    }
  }, [data.meta.tenantId]);

  React.useEffect(() => {
    if (!openMenuId) return;
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [openMenuId]);

  const filteredCustomers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.customers.filter((item) => {
      if (filter === "archived") {
        if (!item.archivedAt) return false;
      } else {
        if (item.archivedAt) return false;
        if (filter === "registered" && item.accountType !== "registered") {
          return false;
        }
        if (filter === "walk_in" && item.accountType !== "walk_in") {
          return false;
        }
        if (filter === "invite_sent" && item.inviteStatus !== "invite_sent") {
          return false;
        }
        if (
          filter === "invite_not_sent" &&
          item.inviteStatus !== "invite_not_sent"
        ) {
          return false;
        }
        if (
          filter === "invite_expired" &&
          item.inviteStatus !== "invite_expired"
        ) {
          return false;
        }
      }

      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        (item.email?.toLowerCase().includes(q) ?? false) ||
        (item.phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data.customers, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageItems = filteredCustomers.slice(startIndex, startIndex + PAGE_SIZE);

  const handleAddCustomer = async (input: CreateCustomerInput) => {
    const res = await createCustomerAction(data.meta.tenantId, input);
    if (!res.success) {
      return { ok: false, error: res.error, fieldErrors: res.fieldErrors };
    }
    setShowAddModal(false);
    await refreshRegistry();
    setStatusModal({
      title: "Customer Added",
      description: res.data?.inviteSent
        ? `${res.data.fullName} was added as a walk-in record and an account invite link was generated.`
        : `${res.data?.fullName ?? input.fullName} was added as a walk-in record. You can book an appointment or send an account invite later.`,
      inviteUrl: res.data?.inviteUrl ?? null,
      deliveryWarning: res.data?.deliveryWarning ?? null,
    });
    return { ok: true };
  };

  const handleEditCustomer = async (input: UpdateCustomerInput) => {
    if (!editingCustomer) return { ok: false, error: "No customer selected." };
    const res = await updateCustomerAction(
      data.meta.tenantId,
      editingCustomer.id,
      input,
    );
    if (!res.success) {
      return { ok: false, error: res.error, fieldErrors: res.fieldErrors };
    }
    setEditingCustomer(null);
    await refreshRegistry();
    setStatusModal({
      title: "Customer Changes Saved",
      description: "Contact details and account preferences were saved.",
    });
    return { ok: true };
  };

  const handleSendInvite = async (customer: CustomerRegistryItem) => {
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await sendCustomerInviteAction(
        data.meta.tenantId,
        customer.id,
      );
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setResendingCustomer(null);
      await refreshRegistry();
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
    if (!cancelingCustomer) return;
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await cancelCustomerInviteAction(
        data.meta.tenantId,
        cancelingCustomer.id,
      );
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setCancelingCustomer(null);
      await refreshRegistry();
      setStatusModal({
        title: "Invitation Canceled",
        description: "The invite link has been canceled successfully.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleArchiveToggle = async (
    customer: CustomerRegistryItem,
    archive: boolean,
  ) => {
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await setCustomerArchivedAction(
        data.meta.tenantId,
        customer.id,
        archive,
      );
      if (!res.success) {
        setErrorBanner(res.error);
        return;
      }
      setArchivingCustomer(null);
      await refreshRegistry();
      setStatusModal({
        title: archive ? "Customer Archived" : "Customer Restored",
        description: archive
          ? "The customer record is now hidden from the active registry. Visit history and notes remain preserved."
          : "The customer record is active in your registry again.",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const { meta, stats } = data;
  const newRatio =
    stats.totalCustomers > 0
      ? Math.min(
          100,
          Math.round((stats.newThisMonth / stats.totalCustomers) * 100),
        )
      : 0;
  const inviteRatio =
    stats.totalCustomers > 0
      ? Math.min(
          100,
          Math.round((stats.invitesPending / stats.totalCustomers) * 100),
        )
      : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#FCFAE8] text-[#1E293B] lg:flex-row">
      <MerchantSidebar
        businessName={meta.businessName}
        userName={meta.userName}
        userEmail={meta.userEmail}
        userRole={meta.userRole}
        basePath={basePath}
      />

      <main className="mx-auto flex w-full max-w-[1320px] min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] leading-[36px] text-[#1E293B] sm:text-[32px] sm:leading-[40px]">
              Customers
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              One customer registry for online bookings and in-person visits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#C35000] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#A64400]"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Customer</span>
          </button>
        </header>

        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
          >
            {errorBanner}
          </div>
        )}

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[#C35000] p-5 text-white shadow-[0_3px_14px_rgb(195_80_0/0.18)]">
            <p className="text-xs font-semibold text-white/90">
              Total customers
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {stats.totalCustomers}
            </p>
            <p className="mt-1 text-xs text-white/80">
              Registered and walk-in clients
            </p>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full w-3/4 rounded-full bg-white" />
            </div>
          </div>

          <div className="rounded-xl border border-[#ECEAE0] bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)]">
            <p className="text-xs font-semibold text-[#1E293B]">
              New this month
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#1E293B]">
              {stats.newThisMonth}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Across all booking sources
            </p>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F3F5]">
              <div
                className="h-full rounded-full bg-[#C35000]"
                style={{
                  width: `${Math.max(newRatio, stats.newThisMonth > 0 ? 15 : 0)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#ECEAE0] bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)]">
            <p className="text-xs font-semibold text-[#1E293B]">
              Returning customers
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#1E293B]">
              {stats.returningPercentage}%
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Customers with more than one visit
            </p>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F3F5]">
              <div
                className="h-full rounded-full bg-[#C35000]"
                style={{ width: `${stats.returningPercentage}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#ECEAE0] bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)]">
            <p className="text-xs font-semibold text-[#1E293B]">
              Invites pending
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#1E293B]">
              {stats.invitesPending}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Walk-in registration invitations
            </p>
            <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F3F5]">
              <div
                className="h-full rounded-full bg-[#C35000]"
                style={{
                  width: `${Math.max(inviteRatio, stats.invitesPending > 0 ? 15 : 0)}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Registry Table Card */}
        <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-0">
          {/* Toolbar */}
          <div className="flex flex-col justify-between gap-3 border-b border-[#F1EFE7] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <h2 className="text-sm font-semibold text-[#1E293B]">
              Customer Registry
            </h2>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="9" r="6" />
                  <path d="M13.5 13.5L17 17" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, or phone"
                  className="h-9 w-full rounded-lg border border-[#D9DDE3] bg-white pl-9 pr-3 text-xs text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 sm:w-[250px]"
                />
              </div>

              <select
                aria-label="Filter customers"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as CustomerFilterOption);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs font-medium text-[#334155] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
              >
                <option value="all">Filter: All active</option>
                <option value="registered">Registered accounts</option>
                <option value="walk_in">Walk-in records</option>
                <option value="invite_sent">Invite sent</option>
                <option value="invite_not_sent">Invite not sent</option>
                <option value="invite_expired">Invite expired</option>
                <option value="archived">Archived records</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#F1EFE7] text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Account</th>
                  <th className="px-4 py-3.5">Last Visit</th>
                  <th className="px-4 py-3.5 text-right">Total Visit</th>
                  <th className="px-4 py-3.5 text-right">Lifetime Spend</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EA] text-xs">
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-[#64748B]"
                    >
                      No customer records match your current search or filter.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item, idx) => {
                    const profileHref = `${basePath}/dashboard/customers/${item.id}`;
                    const openUpward =
                      pageItems.length >= 3 && idx >= pageItems.length - 2;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-[#FCFBF4]"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={profileHref}
                            className="font-semibold text-[#1E293B] hover:text-[#C35000]"
                          >
                            {item.fullName}
                          </Link>
                          {item.notesCount > 0 && (
                            <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                              {item.notesCount}{" "}
                              {item.notesCount === 1
                                ? "internal note"
                                : "internal notes"}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p
                            className={
                              item.email
                                ? "text-[#1E293B]"
                                : "italic text-[#94A3B8]"
                            }
                          >
                            {item.email ?? "No email added"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#64748B]">
                            {item.phone ?? "No phone added"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <AccountBadges item={item} />
                        </td>
                        <td className="px-4 py-4 text-[#334155]">
                          {formatShortDate(item.lastVisitAt)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-[#1E293B]">
                          {item.totalVisits}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[#1E293B]">
                          {formatPesoCents(item.lifetimeSpendCents)}
                        </td>
                        <td className="relative px-6 py-4 text-right">
                          <button
                            type="button"
                            aria-label={`Actions for ${item.fullName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === item.id ? null : item.id,
                              );
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                          >
                            •••
                          </button>

                          {openMenuId === item.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-6 z-30 w-44 rounded-xl border border-[#E2E8F0] bg-white py-1.5 text-left shadow-lg ${
                                openUpward ? "bottom-12" : "top-12"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(profileHref);
                                }}
                                className="block w-full px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                              >
                                View profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingCustomer(item);
                                }}
                                className="block w-full px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                              >
                                Edit customer
                              </button>
                              {item.accountType === "walk_in" &&
                                item.email &&
                                !item.archivedAt && (
                                  <>
                                    {item.inviteStatus === "invite_sent" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setResendingCustomer(item);
                                          }}
                                          className="block w-full px-3.5 py-2 text-xs font-medium text-[#C35000] hover:bg-[#FFF7ED]"
                                        >
                                          Resend invite
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setCancelingCustomer(item);
                                          }}
                                          className="block w-full px-3.5 py-2 text-xs font-medium text-[#B45309] hover:bg-[#FFFBEB]"
                                        >
                                          Cancel invite
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          void handleSendInvite(item);
                                        }}
                                        className="block w-full px-3.5 py-2 text-xs font-medium text-[#C35000] hover:bg-[#FFF7ED]"
                                      >
                                        Send account invite
                                      </button>
                                    )}
                                  </>
                                )}
                              <div className="my-1 border-t border-[#F1F5F9]" />
                              {item.archivedAt ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void handleArchiveToggle(item, false);
                                  }}
                                  className="block w-full px-3.5 py-2 text-xs font-medium text-[#15803D] hover:bg-[#F0FDF4]"
                                >
                                  Restore customer
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setArchivingCustomer(item);
                                  }}
                                  className="block w-full px-3.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
                                >
                                  Archive customer
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1EFE7] px-6 py-3.5 text-xs text-[#64748B]">
            <span>
              {filteredCustomers.length === 0
                ? "Showing 0 of 0"
                : `Showing ${startIndex + 1}–${Math.min(
                    startIndex + PAGE_SIZE,
                    filteredCustomers.length,
                  )} of ${filteredCustomers.length}`}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </Surface>
      </main>

      {/* Modals */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddCustomer}
      />

      {editingCustomer && (
        <EditCustomerModal
          isOpen
          initialValues={{
            fullName: editingCustomer.fullName,
            email: editingCustomer.email ?? "",
            phone: editingCustomer.phone ?? "",
            birthday: editingCustomer.birthday ?? "",
            marketingOptIn: editingCustomer.marketingOptIn,
            accountType: editingCustomer.accountType,
          }}
          onClose={() => setEditingCustomer(null)}
          onSubmit={handleEditCustomer}
        />
      )}

      <ConfirmActionModal
        isOpen={Boolean(resendingCustomer)}
        tone="warning"
        title="Resend Invite Link?"
        description="Send a new account setup link to the saved email. The previous link will stop working. The customer record is retained."
        cancelLabel="Cancel"
        confirmLabel="Resend Invite"
        confirmTone="brand"
        isLoading={actionBusy}
        onCancel={() => setResendingCustomer(null)}
        onConfirm={() => {
          if (resendingCustomer) return handleSendInvite(resendingCustomer);
        }}
      />

      <ConfirmActionModal
        isOpen={Boolean(cancelingCustomer)}
        tone="warning"
        title="Cancel this Invitation?"
        description="The account setup link will stop working. This walk-in record, visit history, and internal notes will be kept."
        cancelLabel="Keep Invite"
        cancelTone="brand"
        confirmLabel="Cancel Invite"
        confirmTone="outline"
        isLoading={actionBusy}
        onCancel={() => setCancelingCustomer(null)}
        onConfirm={handleCancelInvite}
      />

      <ConfirmActionModal
        isOpen={Boolean(archivingCustomer)}
        tone="danger"
        title="Archive Customer Record?"
        description="Hide this record from the active registry. Existing appointments, payments, and notes are kept. You can restore the record later."
        cancelLabel="Keep active"
        confirmLabel="Confirm Archive"
        confirmTone="danger"
        isLoading={actionBusy}
        onCancel={() => setArchivingCustomer(null)}
        onConfirm={() => {
          if (archivingCustomer) {
            return handleArchiveToggle(archivingCustomer, true);
          }
        }}
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
