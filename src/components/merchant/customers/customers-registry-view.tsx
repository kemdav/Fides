"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import { StatusPill, Surface } from "@/components/admin/primitives";
import { RowActionMenu, type RowActionMenuItem } from "@/components/admin/row-action-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
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

const customerFilters: { value: CustomerFilterOption; label: string }[] = [
  { value: "all", label: "All active customers" },
  { value: "registered", label: "Registered accounts" },
  { value: "walk_in", label: "Walk-in records" },
  { value: "invite_sent", label: "Invite sent" },
  { value: "invite_not_sent", label: "Invite not sent" },
  { value: "invite_expired", label: "Invite expired" },
  { value: "archived", label: "Archived records" },
];

function AccountBadges({ item }: { item: CustomerRegistryItem }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {item.accountType === "registered" ? (
        <StatusPill tone="success">Registered account</StatusPill>
      ) : (
        <>
          <StatusPill tone="neutral">Walk-in record</StatusPill>
          {item.inviteStatus === "invite_sent" && <StatusPill tone="warning">Invite sent</StatusPill>}
          {item.inviteStatus === "invite_not_sent" && <StatusPill tone="info">Invite not sent</StatusPill>}
          {item.inviteStatus === "invite_expired" && <StatusPill tone="danger">Invite expired</StatusPill>}
        </>
      )}
      {item.archivedAt && <StatusPill tone="neutral">Archived</StatusPill>}
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

  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterId = React.useId();
  const filterRef = React.useRef<HTMLDivElement>(null);
  const filterTriggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = React.useState<{ customerId: string; anchorEl: HTMLButtonElement } | null>(null);
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
    if (!filterOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [filterOpen]);

  const closeMenu = React.useCallback(() => setActiveMenu(null), []);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
    closeMenu();
  }

  function changeFilter(value: CustomerFilterOption) {
    setFilter(value);
    setPage(1);
    setFilterOpen(false);
    closeMenu();
  }

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

  const menuCustomer = pageItems.find((item) => item.id === activeMenu?.customerId);
  const menuItems: RowActionMenuItem[] = [];
  if (menuCustomer) {
    menuItems.push(
      { label: "View profile", onClick: () => router.push(basePath + "/dashboard/customers/" + menuCustomer.id) },
      { label: "Edit customer", onClick: () => setEditingCustomer(menuCustomer) },
    );

    if (menuCustomer.accountType === "walk_in" && menuCustomer.email && !menuCustomer.archivedAt) {
      if (menuCustomer.inviteStatus === "invite_sent") {
        menuItems.push(
          { label: "Resend invite", tone: "primary", onClick: () => setResendingCustomer(menuCustomer) },
          { label: "Cancel invite", tone: "warning", onClick: () => setCancelingCustomer(menuCustomer) },
        );
      } else {
        menuItems.push({
          label: "Send account invite",
          tone: "primary",
          onClick: () => void handleSendInvite(menuCustomer),
        });
      }
    }

    menuItems.push(menuCustomer.archivedAt ? {
      label: "Restore customer",
      tone: "success",
      dividerBefore: true,
      onClick: () => void handleArchiveToggle(menuCustomer, false),
    } : {
      label: "Archive customer",
      tone: "danger",
      dividerBefore: true,
      onClick: () => setArchivingCustomer(menuCustomer),
    });
  }

  const hasFilters = Boolean(search.trim()) || filter !== "all";

  const { meta, stats } = data;

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
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-2 shadow-xs"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Customer</span>
          </AdminButton>
        </header>

        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
          >
            {errorBanner}
          </div>
        )}

        <section aria-label="Customer metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total customers"
            value={stats.totalCustomers}
            caption="Registered and walk-in clients"
            icon="users"
            progress={100}
            featured
          />
          <MetricCard
            label="New this month"
            value={stats.newThisMonth}
            caption="Across all booking sources"
            icon="calendar"
            progress={100}
          />
          <MetricCard
            label="Returning customers"
            value={stats.returningPercentage}
            valueSuffix="%"
            caption="Customers with more than one visit"
            icon="chart"
            progress={100}
          />
          <MetricCard
            label="Invites pending"
            value={stats.invitesPending}
            caption="Walk-in registration invitations"
            icon="bell"
            progress={100}
          />
        </section>

        <Surface className="!p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Icon name="users" className="size-5 text-glyph" />
              <h2 className="text-base font-semibold leading-6 text-ink">Customer Registry</h2>
            </div>

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-60">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-3.5 size-4 text-glyph"
                />
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Search customers"
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  placeholder="Search name, email, or phone"
                  className="h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-9 text-sm text-ink placeholder:text-glyph transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear customer search"
                    onClick={() => {
                      changeSearch("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-glyph hover:bg-mist hover:text-ink focus-visible:outline-2 focus-visible:outline-burnt"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                )}
              </div>

              <div
                ref={filterRef}
                className="relative shrink-0"
                onKeyDown={(event) => {
                  if (!filterOpen || event.key !== "Escape") return;
                  event.preventDefault();
                  setFilterOpen(false);
                  filterTriggerRef.current?.focus();
                }}
              >
                <button
                  ref={filterTriggerRef}
                  type="button"
                  aria-label="Filter customers"
                  aria-expanded={filterOpen}
                  aria-controls={filterOpen ? filterId : undefined}
                  onClick={() => setFilterOpen((open) => !open)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
                    filterOpen || filter !== "all" ? "border-burnt" : "border-hairline",
                  )}
                >
                  <svg aria-hidden="true" className="size-3.5 text-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span>Filter</span>
                  {filter !== "all" && <span role="img" aria-label="Filter applied" className="size-1.5 rounded-full bg-burnt" />}
                  <Icon name="chevron-down" className={cn("size-3.5 text-glyph transition-transform", filterOpen && "rotate-180")} />
                </button>

                {filterOpen && (
                  <div
                    id={filterId}
                    role="group"
                    aria-label="Customer account filter"
                    className="absolute right-0 z-30 mt-1 max-h-[min(60dvh,24rem)] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[10px] border border-hairline bg-white py-1 shadow-lg"
                  >
                    {customerFilters.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => {
                          changeFilter(value);
                          filterTriggerRef.current?.focus();
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt aria-pressed:font-semibold aria-pressed:text-burnt"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {pageItems.length > 0 ? (
            <div role="region" aria-label="Customer table" tabIndex={0} className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase tracking-wide text-subtle">
                    <th scope="col" className="px-5 py-3">Customer</th>
                    <th scope="col" className="px-5 py-3">Contact</th>
                    <th scope="col" className="px-5 py-3 text-center">Account</th>
                    <th scope="col" className="whitespace-nowrap px-5 py-3">Last visit</th>
                    <th scope="col" className="whitespace-nowrap px-5 py-3 text-right">Total visits</th>
                    <th scope="col" className="whitespace-nowrap px-5 py-3 text-right">Lifetime spend</th>
                    <th scope="col" className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {pageItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-mist">
                      <td className="min-w-36 px-5 py-3.5">
                        <Link
                          href={basePath + "/dashboard/customers/" + item.id}
                          className="font-semibold text-ink underline-offset-2 hover:text-burnt hover:underline focus-visible:outline-2 focus-visible:outline-burnt"
                        >
                          {item.fullName}
                        </Link>
                        {item.notesCount > 0 && (
                          <p className="mt-0.5 text-xs text-muted">
                            {item.notesCount} {item.notesCount === 1 ? "internal note" : "internal notes"}
                          </p>
                        )}
                      </td>
                      <td className="min-w-40 max-w-64 px-5 py-3.5">
                        <p className={item.email ? "break-words text-body" : "italic text-muted"}>
                          {item.email ?? "No email added"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{item.phone ?? "No phone added"}</p>
                      </td>
                      <td className="min-w-40 px-5 py-3.5">
                        <AccountBadges item={item} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted">
                        {formatShortDate(item.lastVisitAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums text-body">
                        {item.totalVisits}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-ink">
                        {formatPesoCents(item.lifetimeSpendCents)}
                      </td>
                      <td className="px-5 py-3.5 text-center align-middle">
                        <button
                          type="button"
                          aria-label={"Actions for " + item.fullName}
                          aria-haspopup="menu"
                          aria-expanded={activeMenu?.customerId === item.id}
                          onClick={(event) => {
                            const anchorEl = event.currentTarget;
                            setActiveMenu((current) => current?.customerId === item.id ? null : { customerId: item.id, anchorEl });
                          }}
                          className={cn(
                            "mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
                            activeMenu?.customerId === item.id ? "bg-mist text-ink" : "text-glyph hover:bg-mist hover:text-ink",
                          )}
                        >
                          <Icon name="more" weight="fill" className="size-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-6 text-center sm:py-8">
              <EmptyState
                compact
                title={hasFilters ? "No matching customers" : "No customers yet"}
                description={hasFilters
                  ? "Try a different search or reset the filters to see all active customers."
                  : "Add a customer to keep their contact details and visit history in one place."}
              />
              {hasFilters ? (
                <AdminButton size="xs" onClick={() => {
                  changeSearch("");
                  changeFilter("all");
                }}>
                  Reset filters
                </AdminButton>
              ) : (
                <AdminButton size="xs" onClick={() => setShowAddModal(true)}>+ Add Customer</AdminButton>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-4 text-sm text-muted sm:px-6">
            <span role="status">
              {filteredCustomers.length === 0
                ? "Showing 0 of 0"
                : "Showing " + (startIndex + 1) + "–" + Math.min(startIndex + PAGE_SIZE, filteredCustomers.length) + " of " + filteredCustomers.length}
            </span>
            <nav aria-label="Customer pagination" className="flex flex-wrap items-center gap-2.5">
              <AdminButton size="xs" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </AdminButton>
              <span className="text-xs tabular-nums">Page {safePage} of {totalPages}</span>
              <AdminButton size="xs" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                Next
              </AdminButton>
            </nav>
          </div>
        </Surface>

        <RowActionMenu
          label="Customer actions"
          isOpen={Boolean(menuCustomer)}
          anchorEl={activeMenu?.anchorEl ?? null}
          onClose={closeMenu}
          items={menuItems}
        />
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
