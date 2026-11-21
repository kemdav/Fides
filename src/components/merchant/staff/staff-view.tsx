"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addStaffMemberAction,
  updateStaffMemberAction,
  toggleStaffActiveAction,
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
  sortOrder: number;
  createdAt: string;
}

interface StaffViewProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantId?: string;
  activeMembers?: number;
  onShiftToday?: number;
  pendingInvitations?: number;
  commissionThisMonth?: number;
  initialItems?: StaffItem[];
  basePath?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <StatusPill tone={active ? "success" : "danger"}>
      {active ? "Active" : "Inactive"}
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

// ─── Add Staff Modal ────────────────────────────────────────────────────────

function AddStaffModal({
  isOpen,
  tenantId,
  onClose,
  onCreated,
  showToast,
}: {
  isOpen: boolean;
  tenantId?: string;
  onClose: () => void;
  onCreated: (item: StaffItem) => void;
  showToast: (msg: string) => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await addStaffMemberAction({
        tenantId: tenantId ?? "",
        fullName: fullName.trim(),
        title: title.trim() || undefined,
      });
      if (!res.success) {
        showToast(res.error || "Failed to add staff.");
        return;
      }
      onCreated({
        id: res.id!,
        fullName: fullName.trim(),
        email: "Not provided",
        title: title.trim(),
        role: "staff",
        roleLabel: "Service Staff",
        servicesDisplay: "No services assigned",
        serviceNames: "",
        commissionDisplay: "No commission",
        active: true,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      });
      showToast(`${fullName.trim()} added successfully.`);
      setFullName("");
      setTitle("");
      onClose();
    } catch {
      showToast("Failed to add staff.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-[10px] bg-white p-6 shadow-2xl border border-line">
        <h3 className="font-display text-[22px] leading-tight text-ink">Add Staff Member</h3>
        <p className="mt-1 text-sm text-muted">Create a new team member for your business.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Full name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Elena Cruz"
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Title / role</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Stylist"
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" onClick={handleSave} disabled={saving}>
            {saving ? "Adding…" : "Add Member"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Staff Modal ───────────────────────────────────────────────────────

function EditStaffModal({
  isOpen,
  tenantId,
  staff,
  onClose,
  onUpdated,
  showToast,
}: {
  isOpen: boolean;
  tenantId?: string;
  staff: StaffItem | null;
  onClose: () => void;
  onUpdated: (item: StaffItem) => void;
  showToast: (msg: string) => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (staff) {
      setFullName(staff.fullName);
      setTitle(staff.title);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateStaffMemberAction({
        staffId: staff.id,
        tenantId: tenantId ?? "",
        fullName: fullName.trim(),
        title: title.trim() || undefined,
      });
      if (!res.success) {
        showToast(res.error || "Failed to update.");
        return;
      }
      onUpdated({ ...staff, fullName: fullName.trim(), title: title.trim() });
      showToast(`${fullName.trim()} updated.`);
      onClose();
    } catch {
      showToast("Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-[10px] bg-white p-6 shadow-2xl border border-line">
        <h3 className="font-display text-[22px] leading-tight text-ink">Edit Staff Member</h3>
        <p className="mt-1 text-sm text-muted">Update {staff.fullName}&apos;s details.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Full name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Title / role</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function StaffView({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
  tenantId,
  activeMembers = 0,
  onShiftToday = 0,
  pendingInvitations = 0,
  commissionThisMonth = 0,
  initialItems = EMPTY_ITEMS,
  basePath = "",
}: StaffViewProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<StaffItem[]>(initialItems);
  const prevInitialItemsRef = React.useRef(initialItems);
  if (prevInitialItemsRef.current !== initialItems) {
    prevInitialItemsRef.current = initialItems;
    setItems(initialItems);
  }

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [rolesExpanded, setRolesExpanded] = React.useState(true);
  const [sortExpanded, setSortExpanded] = React.useState(true);
  const [roleFilter, setRoleFilter] = React.useState("All team members");
  const [sortBy, setSortBy] = React.useState("Public Display order");

  // Modal states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<StaffItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StaffItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

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
        case "Invited &Expired":
          matchesRole = false; // No invitation system yet
          break;
        case "Deactivated Accounts":
          matchesRole = !item.active;
          break;
        case "Service Staff only":
          matchesRole = item.role === "staff";
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

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleToggleActive = async (staff: StaffItem) => {
    setActiveMenuId(null);
    const prevItems = items;
    const newActive = !staff.active;
    setItems((prev) => prev.map((s) => (s.id === staff.id ? { ...s, active: newActive } : s)));
    try {
      const res = await toggleStaffActiveAction({ staffId: staff.id, tenantId: tenantId ?? "", active: newActive });
      if (!res.success) { setItems(prevItems); showToast(res.error || "Failed to update."); return; }
      showToast(`${staff.fullName} ${newActive ? "activated" : "deactivated"}.`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to update.");
    }
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

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          {/* ── Page Heading ─────────────────────────────────────────────── */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title="Staff & permissions"
            description="Manage team access, service eligibility, invitations, and commission rules."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                  + Invite Staff
                </AdminButton>
                <AdminButton variant="outline" size="sm">
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
              progress={100}
            />
            <MetricCard
              label="On shift today"
              value={onShiftToday}
              caption="View staff working hours"
              icon="clock"
              progress={items.length > 0 ? Math.round((onShiftToday / items.length) * 100) : 0}
            />
            <MetricCard
              label="Pending invitations"
              value={pendingInvitations}
              caption="Manage sent invitations"
              icon="bell"
              progress={pendingInvitations > 0 ? 50 : 0}
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

          {/* ── Main Staff Register Surface ───────────────────────────────── */}
          <Surface className="overflow-hidden !p-0">
            {/* ── Controls Bar ───────────────────────────────────────────── */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
              {/* Left: title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">Staff Register</h2>
                </div>
              </div>

              {/* Right: search + filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 w-48 sm:w-60 transition-shadow"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>

                {/* Filter button + dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`h-11 rounded-lg border px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${isFilterOpen ? "border-burnt bg-white" : "border-hairline bg-white"}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-glyph" aria-hidden>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filter</span>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={`size-3.5 text-glyph transition-transform ${isFilterOpen ? "rotate-180" : ""}`} aria-hidden>
                      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Filter dropdown panel */}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-1 w-56 rounded-[10px] bg-white border border-hairline shadow-lg z-20 text-sm overflow-hidden">
                      {/* Roles section */}
                      <div className="border-b border-hairline">
                        <button
                          type="button"
                          onClick={() => setRolesExpanded(!rolesExpanded)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wide hover:bg-mist"
                        >
                          <span>Roles</span>
                          <span className="text-base leading-none text-glyph">{rolesExpanded ? "−" : "+"}</span>
                        </button>
                        {rolesExpanded && (
                          <div className="pb-2">
                            {["All team members", "Active Accounts", "Invited &Expired", "Deactivated Accounts", "Service Staff only"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setRoleFilter(opt)}
                                className={`w-full text-left px-4 py-2 hover:bg-mist transition-colors ${roleFilter === opt ? "text-burnt font-semibold" : "text-body"}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sort section */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setSortExpanded(!sortExpanded)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-subtle uppercase tracking-wide hover:bg-mist"
                        >
                          <span>Sort</span>
                          <span className="text-base leading-none text-glyph">{sortExpanded ? "−" : "+"}</span>
                        </button>
                        {sortExpanded && (
                          <div className="pb-2">
                            {["Name A-Z", "Public Display order"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setSortBy(opt)}
                                className={`w-full text-left px-4 py-2 hover:bg-mist transition-colors ${sortBy === opt ? "text-burnt font-semibold" : "text-body"}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Active filter badge */}
                {hasActiveFilter && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-burnt/10 px-2 py-1 text-xs font-semibold text-burnt">
                    {roleFilter}
                    <button type="button" onClick={() => setRoleFilter("All team members")} className="ml-0.5 hover:text-burnt-dark" aria-label="Clear filter">×</button>
                  </span>
                )}
              </div>
            </div>

            {/* ── Desktop table headers ────────────────────────────────────── */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Team Member / Email</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Role / Public Title</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Services</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Commission</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Status / Shift</th>
                    <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide text-right">Action</th>
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
                      <tr key={row.id} className="hover:bg-mist/50 transition-colors">
                        {/* Team Member / Email */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-burnt/10 text-sm font-semibold text-burnt">
                              {getInitials(row.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate">{row.fullName}</p>
                              <p className="text-xs text-muted truncate">{row.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role / Public Title */}
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-ink">{row.roleLabel}</p>
                          <p className="text-xs text-muted">{row.title || "—"}</p>
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
                          <StatusBadge active={row.active} />
                          <p className="text-xs text-muted mt-1">
                            {row.active
                              ? (row.role === "owner" || row.role === "admin"
                                ? "No service shift"
                                : "On shift · 09:00-17:00")
                              : "Deactivated"}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph ml-auto"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>
                          {activeMenuId === row.id && (
                            <div className="absolute right-4 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                              <button type="button" onClick={() => { setEditTarget(row); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-mist text-body">Edit details</button>
                              <button type="button" onClick={() => handleToggleActive(row)} className="w-full text-left px-4 py-2 hover:bg-mist text-body">{row.active ? "Deactivate" : "Activate"}</button>
                              <button type="button" onClick={() => { setDeleteTarget(row); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium">Remove member</button>
                            </div>
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
                  return (
                    <div key={row.id} className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setExpandedStaffId(isExpanded ? null : row.id)}
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-burnt/10 text-sm font-semibold text-burnt">
                              {getInitials(row.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-ink">{row.fullName}</p>
                              <p className="mt-0.5 text-sm text-muted">{row.roleLabel} · {row.title || "No title"}</p>
                            </div>
                          </div>
                          <StatusBadge active={row.active} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 rounded-lg bg-powder p-4 text-sm text-muted">
                          <div className="grid grid-cols-2 gap-3">
                            <span>Email<strong className="mt-1 block text-ink text-xs">{row.email}</strong></span>
                            <span>Services<strong className="mt-1 block text-ink text-xs">{row.servicesDisplay}</strong></span>
                            <span>Commission<strong className="mt-1 block text-ink text-xs">{row.commissionDisplay}</strong></span>
                            <span>Status<strong className="mt-1 block text-ink text-xs">{row.active ? "Active" : "Inactive"}</strong></span>
                          </div>
                          {row.serviceNames && (
                            <div className="border-t border-hairline pt-3">
                              <p className="text-xs text-subtle">Assigned services</p>
                              <p className="text-sm text-ink mt-1">{row.serviceNames}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                            <AdminButton size="xs" variant="outline" onClick={() => setEditTarget(row)}>Edit</AdminButton>
                            <AdminButton size="xs" variant="outline" onClick={() => handleToggleActive(row)}>
                              {row.active ? "Deactivate" : "Activate"}
                            </AdminButton>
                            <AdminButton size="xs" variant="danger" onClick={() => setDeleteTarget(row)}>Remove</AdminButton>
                          </div>
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

      {/* ── Add Staff Modal ────────────────────────────────────────────────── */}
      <AddStaffModal
        isOpen={isAddOpen}
        tenantId={tenantId}
        onClose={() => setIsAddOpen(false)}
        onCreated={(item) => setItems((prev) => [item, ...prev])}
        showToast={showToast}
      />

      {/* ── Edit Staff Modal ───────────────────────────────────────────────── */}
      <EditStaffModal
        isOpen={!!editTarget}
        tenantId={tenantId}
        staff={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={(updated) => setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
        showToast={showToast}
      />

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl text-xs font-medium">
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
