"use client";

import * as React from "react";
import Link from "next/link";
import { ManageStaffModal, type ManagedStaff } from "./manage-staff-modal";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { cancelStaffInvitationAction, deleteStaffInvitationAction, resendStaffInvitationAction } from "@/app/actions/staff-invitations";
import { InviteStaffModal } from "./invite-staff-modal";
import { RoleAccessModal } from "./role-access-modal";
import { StaffStatusDialog } from "./staff-status-dialog";
import { StaffConfirmationDialog } from "./staff-confirmation-dialog";
import {
  loadStaffEditorAction,
  deleteStaffMemberAction,
} from "@/app/actions/staff";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StaffItem {
  id: string;
  fullName: string;
  email: string;
  title: string;
  role: string;
  roleLabel: string;
  servicesDisplay: string;
  serviceNames: string;
  commissionDisplay: string;
  active: boolean;
  shiftDisplay: string;
  invitationStatus?: "pending" | "expired" | "cancelled";
}

interface StaffViewProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantId?: string;
  canViewProfiles?: boolean;
  activeMembers?: number;
  onShiftToday?: number;
  pendingInvitations?: number;
  commissionThisMonth?: number;
  initialItems?: StaffItem[];
  basePath?: string;
  services?: { id: string; name: string }[];
  staffLimit?: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const invitationLabels = { pending: "Invited", expired: "Invite expired", cancelled: "Invite cancelled" };
const invitationActions = {
  cancel: { label: "Cancel invitation", success: "Invitation cancelled.", run: cancelStaffInvitationAction },
  delete: { label: "Delete invitation", success: "Invitation deleted.", run: deleteStaffInvitationAction },
  resend: { label: "Resend email", success: "Invitation email resent.", run: resendStaffInvitationAction },
};
type InvitationAction = keyof typeof invitationActions;

function StatusBadge({ row }: { row: StaffItem }) {
  if (row.invitationStatus) {
    return <StatusPill tone={row.invitationStatus === "pending" ? "warning" : "neutral"}>{invitationLabels[row.invitationStatus]}</StatusPill>;
  }
  return (
    <StatusPill tone={row.active ? "success" : "danger"}>
      {row.active ? "Active" : "Inactive"}
    </StatusPill>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const EMPTY_ITEMS: StaffItem[] = [];

// ─── Main Component ─────────────────────────────────────────────────────────

export function StaffView({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
  tenantId,
  canViewProfiles = false,
  activeMembers = 0,
  onShiftToday = 0,
  pendingInvitations = 0,
  commissionThisMonth = 0,
  initialItems = EMPTY_ITEMS,
  basePath = "",
  services = [],
  staffLimit,
}: StaffViewProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<StaffItem[]>(initialItems);
  const [previousInitialItems, setPreviousInitialItems] = React.useState(initialItems);
  if (previousInitialItems !== initialItems) {
    setPreviousInitialItems(initialItems);
    setItems(initialItems);
  }

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState("All team members");
  const [sortBy, setSortBy] = React.useState("Public Display order");

  // Modal states
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [isRoleAccessOpen, setIsRoleAccessOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ManagedStaff | null>(null);
  const [loadingEditId, setLoadingEditId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StaffItem | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<StaffItem | null>(null);
  const [inviteAction, setInviteAction] = React.useState<{ row: StaffItem; type: InvitationAction } | null>(null);
  const [runningInviteAction, setRunningInviteAction] = React.useState(false);
  const [inviteActionError, setInviteActionError] = React.useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  function openInvitationAction(row: StaffItem, type: InvitationAction) {
    setActiveMenuId(null);
    setInviteActionError("");
    setInviteAction({ row, type });
  }

  async function confirmInvitationAction() {
    if (!tenantId || !inviteAction || runningInviteAction) return;
    const action = invitationActions[inviteAction.type];
    setRunningInviteAction(true);
    setInviteActionError("");
    try {
      const result = await action.run(tenantId, inviteAction.row.id);
      if (result.error) {
        setInviteActionError(result.error);
        return;
      }
      setInviteAction(null);
      showToast(action.success);
      router.refresh();
    } catch {
      setInviteActionError("The invitation could not be updated. Try again.");
    } finally {
      setRunningInviteAction(false);
    }
  }

  const inviteActionDescription = inviteAction && {
    cancel: `Cancelling the invitation for ${inviteAction.row.fullName} will disable the link and free the reserved staff seat.`,
    delete: `Delete the cancelled invitation for ${inviteAction.row.fullName} from the roster?`,
    resend: `Send a new invitation link to ${inviteAction.row.email}? The previous link will stop working.`,
  }[inviteAction.type];

  async function openEditor(staffId: string) {
    if (!tenantId || loadingEditId) return;
    setActiveMenuId(null);
    setLoadingEditId(staffId);
    try {
      const staff = await loadStaffEditorAction(tenantId, staffId);
      if (staff) setEditTarget(staff);
      else showToast("Staff details are unavailable.");
    } catch {
      showToast("Staff details could not be loaded. Try again.");
    } finally {
      setLoadingEditId(null);
    }
  }

  // ── Filter + sort logic ───────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let result = items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.serviceNames.toLowerCase().includes(q);

      let matchesRole = true;
      switch (roleFilter) {
        case "Active Accounts":
          matchesRole = item.active;
          break;
        case "Invited & Expired":
          matchesRole = item.invitationStatus === "pending" || item.invitationStatus === "expired";
          break;
        case "Cancelled Invitations":
          matchesRole = item.invitationStatus === "cancelled";
          break;
        case "Deactivated Accounts":
          matchesRole = !item.active && !item.invitationStatus;
          break;
        case "Service Staff only":
          matchesRole = item.role === "staff" && !item.invitationStatus;
          break;
        // "All team members" = default, no filter
      }

      return matchesSearch && matchesRole;
    });

    // Sort
    if (sortBy === "Name A-Z") {
      result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    // "Public Display order" is the natural sort_order from DB

    return result;
  }, [items, searchQuery, roleFilter, sortBy]);

  // Active filter label for badge
  const hasActiveFilter = roleFilter !== "All team members";
  const rosterSize = items.filter((row) => !row.invitationStatus).length;

  // ── Action handlers ───────────────────────────────────────────────────────

  const openStatusDialog = (staff: StaffItem) => {
    setActiveMenuId(null);
    setStatusTarget(staff);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const prevItems = items;
    setItems((prev) => prev.filter((s) => s.id !== target.id));
    try {
      const res = await deleteStaffMemberAction({ staffId: target.id, tenantId: tenantId ?? "" });
      if (!res.success) { setItems(prevItems); showToast(res.error || "Failed to remove."); return; }
      showToast(`${target.fullName} removed.`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to remove.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar businessName={businessName} userName={userName} userEmail={userEmail} userRole={userRole} basePath={basePath} />

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
        <PageContent>
          {/* ── Page Heading ─────────────────────────────────────────────── */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title="Staff & permissions"
            description="Manage team access, service eligibility, invitations, and commission rules."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
                  + Invite Staff
                </AdminButton>
                <AdminButton variant="outline-accent" size="sm" aria-haspopup="dialog" onClick={() => setIsRoleAccessOpen(true)}>
                  Role &amp; Access
                </AdminButton>
              </div>
            }
          />

          {/* ── KPI Metric Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              label="Active team members"
              value={activeMembers}
              caption="Owner, reception, and service staff"
              icon="users"
              progress={rosterSize ? Math.min(100, 100 * activeMembers / rosterSize) : 0}
            />
            <MetricCard
              label="On shift today"
              value={onShiftToday}
              caption="Active staff with scheduled hours"
              icon="clock"
              progress={activeMembers ? 100 * onShiftToday / activeMembers : 0}
            />
            <MetricCard
              label="Pending invitations"
              value={pendingInvitations}
              caption="Unaccepted, unexpired invitations"
              icon="bell"
              progress={staffLimit ? Math.min(100, 100 * pendingInvitations / staffLimit) : pendingInvitations > 0 ? 50 : 0}
            />
            <MetricCard
              label="Commission this month"
              value={commissionThisMonth}
              valuePrefix="₱"
              caption="Completed services · This month"
              icon="chart"
              progress={commissionThisMonth > 0 ? 60 : 0}
            />
          </div>

          {/* ── Main Staff Roster Surface ───────────────────────────────── */}
          <Surface className="!p-0">
            {/* ── Controls Bar ───────────────────────────────────────────── */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
              {/* Left: title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">Staff Roster</h2>
                </div>
              </div>

              {/* Right: search + filter */}
              <div className="flex w-full items-center gap-2.5 sm:w-auto">
                {/* Search */}
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    aria-label="Search staff or service"
                    placeholder="Search staff or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-3 text-sm text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40 sm:w-68"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>
                {/* Filter button + dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    aria-expanded={isFilterOpen}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`h-11 rounded-lg border px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${isFilterOpen ? "border-burnt bg-white" : "border-hairline bg-white"}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-glyph" aria-hidden>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span className="relative">
                      Filter
                      {(hasActiveFilter || sortBy !== "Public Display order") && (
                        <span className="absolute -right-1.5 top-0 size-1.5 rounded-full bg-burnt" aria-label="Filter settings applied" />
                      )}
                    </span>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={`size-3.5 text-glyph transition-transform ${isFilterOpen ? "rotate-180" : ""}`} aria-hidden>
                      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Filter dropdown panel */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-1 w-56 rounded-[10px] bg-white border border-hairline shadow-lg z-20 text-sm overflow-hidden">
                      <details className="group border-b border-hairline">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle hover:bg-mist [&::-webkit-details-marker]:hidden">
                          Roles
                          <span aria-hidden="true" className="group-open:hidden">+</span>
                          <span aria-hidden="true" className="hidden group-open:inline">−</span>
                        </summary>
                        <div className="pb-2">
                            {["All team members", "Active Accounts", "Invited & Expired", "Cancelled Invitations", "Deactivated Accounts", "Service Staff only"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              aria-pressed={roleFilter === opt}
                              onClick={() => setRoleFilter(opt)}
                              className={`w-full px-4 py-2 text-left hover:bg-mist ${roleFilter === opt ? "font-semibold text-burnt" : "text-body"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </details>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle hover:bg-mist [&::-webkit-details-marker]:hidden">
                          Sort
                          <span aria-hidden="true" className="group-open:hidden">+</span>
                          <span aria-hidden="true" className="hidden group-open:inline">−</span>
                        </summary>
                        <div className="pb-2">
                          {["Name A-Z", "Public Display order"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              aria-pressed={sortBy === opt}
                              onClick={() => setSortBy(opt)}
                              className={`w-full px-4 py-2 text-left hover:bg-mist ${sortBy === opt ? "font-semibold text-burnt" : "text-body"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ── Desktop table headers ────────────────────────────────────── */}
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Team Member / Email</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Role / Public Title</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Services</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Commission</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Status / Shift</th>
                    <th className="py-3 text-center text-[11px] leading-4 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-2">
                        <EmptyState
                          compact
                          title={searchQuery || hasActiveFilter ? "No staff match your search." : "No staff members yet."}
                          description="Add your first team member to get started."
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="relative transition-colors hover:bg-mist/50 focus-within:bg-mist/50">
                        {/* Team Member / Email */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-burnt/10 text-sm font-semibold text-burnt">
                              {getInitials(row.fullName)}
                            </div>
                            <div className="min-w-0">
                              {canViewProfiles && !row.invitationStatus ? (
                                <Link
                                  href={`${basePath}/dashboard/staff/${row.id}`}
                                  className="block truncate font-semibold text-ink after:absolute after:inset-0 hover:text-burnt focus-visible:outline-burnt"
                                >
                                  {row.fullName}
                                </Link>
                              ) : (
                                <p className="truncate font-semibold text-ink">{row.fullName}</p>
                              )}
                              <p className="text-xs text-muted truncate">{row.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role / Public Title */}
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-ink">{row.roleLabel}</p>
                          <p className="break-words text-xs text-muted">{row.title || "—"}</p>
                        </td>

                        {/* Services */}
                        <td className="px-5 py-3.5">
                          <p className="text-muted">{row.servicesDisplay}</p>
                          {row.serviceNames && (
                            <p className="text-xs text-subtle truncate max-w-[180px]">{row.serviceNames}</p>
                          )}
                        </td>

                        {/* Commission */}
                        <td className="px-5 py-3.5 text-muted">{row.commissionDisplay}</td>

                        {/* Status / Shift */}
                        <td className="px-5 py-3.5">
                          <StatusBadge row={row} />
                          <p className="mt-1 text-xs text-muted">{row.shiftDisplay}</p>
                        </td>

                        {/* Action */}
                        <td className="relative py-3.5">
                          {row.invitationStatus === "expired" ? (
                            <span className="block text-center text-xs text-muted">—</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-label={`Actions for ${row.fullName}`}
                                aria-expanded={activeMenuId === row.id}
                                aria-busy={loadingEditId === row.id}
                                onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                                className="relative z-10 mx-auto flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph"
                              >
                                <Icon name="more" weight="fill" className="size-5" />
                              </button>
                              {activeMenuId === row.id && (
                                <div className="absolute right-4 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                                  {row.invitationStatus === "pending" ? (
                                    <>
                                      <button type="button" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "resend")}
                                        className="w-full px-4 py-2 text-left text-body hover:bg-mist">Resend email</button>
                                      <button type="button" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "cancel")}
                                        className="w-full px-4 py-2 text-left font-medium text-danger hover:bg-danger-bg">Cancel invitation</button>
                                    </>
                                  ) : row.invitationStatus === "cancelled" ? (
                                    <button type="button" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "delete")}
                                      className="w-full px-4 py-2 text-left font-medium text-danger hover:bg-danger-bg">Delete invitation</button>
                                  ) : (
                                    <>
                                        {canViewProfiles && (
                                          <button type="button" disabled={Boolean(loadingEditId)} onClick={() => openEditor(row.id)} className="w-full px-4 py-2 text-left text-body hover:bg-mist disabled:opacity-50">Edit details</button>
                                        )}
                                        <button type="button" aria-haspopup="dialog" onClick={() => openStatusDialog(row)} className="w-full text-left px-4 py-2 hover:bg-mist text-body">{row.active ? "Deactivate" : "Activate"}</button>
                                        <button type="button" onClick={() => { setDeleteTarget(row); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium">Remove member</button>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ─────────────────────────────────────────────── */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.length === 0 ? (
                <EmptyState
                  compact
                  title={searchQuery || hasActiveFilter ? "No staff match your search." : "No staff members yet."}
                  description="Add your first team member to get started."
                />
              ) : (
                filtered.map((row) => {
                  const isExpanded = expandedStaffId === row.id;
                  const heading = (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-burnt/10 text-sm font-semibold text-burnt">
                          {getInitials(row.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-ink">{row.fullName}</p>
                          <p className="mt-0.5 text-sm text-muted">{row.roleLabel} · {row.title || "No title"}</p>
                        </div>
                      </div>
                      <StatusBadge row={row} />
                    </div>
                  );
                  return (
                    <div key={row.id} className="px-5 py-4">
                      {canViewProfiles && !row.invitationStatus ? (
                        <Link href={`${basePath}/dashboard/staff/${row.id}`} className="block rounded-lg text-left focus-visible:outline-burnt">
                          {heading}
                        </Link>
                      ) : heading}
                      <button
                        type="button"
                        onClick={() => setExpandedStaffId(isExpanded ? null : row.id)}
                        className="mt-2 text-xs font-semibold text-burnt"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Hide" : "Show"} details for ${row.fullName}`}
                      >
                        {isExpanded ? "Hide details" : "Show details"}
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 rounded-lg bg-powder p-4 text-sm text-muted">
                          <div className="grid grid-cols-2 gap-3">
                            <span>Email<strong className="mt-1 block text-ink text-xs">{row.email}</strong></span>
                            <span>Services<strong className="mt-1 block text-ink text-xs">{row.servicesDisplay}</strong></span>
                            <span>Commission<strong className="mt-1 block text-ink text-xs">{row.commissionDisplay}</strong></span>
                            <span>{row.invitationStatus ? "Invitation" : "Shift"}<strong className="mt-1 block text-ink text-xs">{row.shiftDisplay}</strong></span>
                          </div>
                          {row.serviceNames && (
                            <div className="border-t border-hairline pt-3">
                              <p className="text-xs text-subtle">Assigned services</p>
                              <p className="text-sm text-ink mt-1">{row.serviceNames}</p>
                            </div>
                          )}
                          {!row.invitationStatus && <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                            {canViewProfiles && (
                              <AdminButton size="xs" variant="outline" disabled={Boolean(loadingEditId)} onClick={() => openEditor(row.id)}>
                                {loadingEditId === row.id ? "Loading…" : "Edit details"}
                              </AdminButton>
                            )}
                            <AdminButton size="xs" variant="outline" aria-haspopup="dialog" onClick={() => openStatusDialog(row)}>
                              {row.active ? "Deactivate" : "Activate"}
                            </AdminButton>
                            <AdminButton size="xs" variant="danger" onClick={() => setDeleteTarget(row)}>Remove</AdminButton>
                          </div>}
                          {row.invitationStatus === "pending" && (
                            <div className="flex flex-wrap gap-2">
                              <AdminButton size="xs" variant="outline-accent" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "resend")}>Resend email</AdminButton>
                              <AdminButton size="xs" variant="outline" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "cancel")}>Cancel invitation</AdminButton>
                            </div>
                          )}
                          {row.invitationStatus === "cancelled" && (
                            <AdminButton size="xs" variant="danger" aria-haspopup="dialog" onClick={() => openInvitationAction(row, "delete")}>Delete invitation</AdminButton>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Emails marked &quot;Not provided&quot; need profile data. Invited identities use invitation records; they do not count as active staff.
              </span>
            </div>
          </Surface>
        </PageContent>
      </div>

      {isRoleAccessOpen && <RoleAccessModal onClose={() => setIsRoleAccessOpen(false)} />}

      {isInviteOpen && tenantId && (
        <InviteStaffModal
          tenantId={tenantId}
          canInviteAdmins={userRole === "Business owner"}
          onClose={() => setIsInviteOpen(false)}
          onSent={() => {
            setIsInviteOpen(false);
            showToast("Staff invitation sent.");
            router.refresh();
          }}
          seatsUsed={activeMembers + pendingInvitations}
          staffLimit={staffLimit}
          services={services}
        />
      )}

      {/* ── Edit Staff Modal ───────────────────────────────────────────────── */}
      {loadingEditId && <p role="status" className="sr-only">Loading staff details…</p>}
      {editTarget && tenantId && (
        <ManageStaffModal
          key={editTarget.id}
          tenantId={tenantId}
          basePath={basePath}
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            showToast("Staff changes saved.");
            router.refresh();
          }}
        />
      )}

      {statusTarget && tenantId && (
        <StaffStatusDialog tenantId={tenantId} staff={statusTarget}
          lastOwnerProtected={statusTarget.active && statusTarget.role === "owner"
            && !items.some((staff) => staff.id !== statusTarget.id && staff.active && staff.role === "owner")}
          onClose={() => setStatusTarget(null)}
          onChanged={(active) => {
            showToast(`${statusTarget.fullName} ${active ? "activated" : "deactivated"}.`);
            setStatusTarget(null);
            router.refresh();
          }} />
      )}

      {inviteAction && (
        <StaffConfirmationDialog title={`${invitationActions[inviteAction.type].label}?`}
          warning={inviteAction.type !== "resend"} busy={runningInviteAction}
          error={inviteActionError} onClose={() => setInviteAction(null)} description={inviteActionDescription}>
          <AdminButton size="xs" variant="outline" disabled={runningInviteAction} onClick={() => setInviteAction(null)}>
            {inviteAction.type === "resend" ? "Cancel" : "Keep invitation"}
          </AdminButton>
          <AdminButton size="xs" variant={inviteAction.type === "resend" ? "primary" : "danger"}
            disabled={runningInviteAction} onClick={confirmInvitationAction}>
            {runningInviteAction ? "Please wait…" : invitationActions[inviteAction.type].label}
          </AdminButton>
        </StaffConfirmationDialog>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-[10px] bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-display text-[22px] leading-tight text-ink">Remove Staff?</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-ink">{deleteTarget.fullName}</span>
              {deleteTarget.title ? ` (${deleteTarget.title})` : ""}? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <AdminButton variant="outline" size="xs" onClick={() => setDeleteTarget(null)}>Keep</AdminButton>
              <AdminButton variant="danger" size="xs" onClick={handleConfirmDelete}>Confirm Remove</AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
