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
  title: string;
  bio: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  profileId: string | null;
  role: string;
  createdAt: string;
}

interface StaffViewProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantId?: string;
  totalStaff?: number;
  activeStaff?: number;
  ownersCount?: number;
  inactiveStaff?: number;
  initialItems?: StaffItem[];
  basePath?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function RolePill({ role }: { role: string }) {
  const toneMap: Record<string, { tone: React.ComponentProps<typeof StatusPill>["tone"]; label: string }> = {
    owner:        { tone: "warning", label: "Owner" },
    admin:        { tone: "info",    label: "Admin" },
    receptionist: { tone: "success", label: "Receptionist" },
    staff:        { tone: "neutral", label: "Staff" },
  };
  const { tone, label } = toneMap[role] ?? { tone: "neutral", label: role };
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

function ActiveBadge({ active }: { active: boolean }) {
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
  const [bio, setBio] = React.useState("");
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
        bio: bio.trim() || undefined,
      });
      if (!res.success) {
        showToast(res.error || "Failed to add staff.");
        return;
      }
      onCreated({
        id: res.id!,
        fullName: fullName.trim(),
        title: title.trim(),
        bio: bio.trim(),
        imageUrl: "",
        active: true,
        sortOrder: 0,
        profileId: null,
        role: "staff",
        createdAt: new Date().toISOString(),
      });
      showToast(`${fullName.trim()} added successfully.`);
      setFullName("");
      setTitle("");
      setBio("");
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
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio or description"
              rows={3}
              className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
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
  const [bio, setBio] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (staff) {
      setFullName(staff.fullName);
      setTitle(staff.title);
      setBio(staff.bio);
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
        bio: bio.trim() || undefined,
      });
      if (!res.success) {
        showToast(res.error || "Failed to update.");
        return;
      }
      onUpdated({
        ...staff,
        fullName: fullName.trim(),
        title: title.trim(),
        bio: bio.trim(),
      });
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
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Title / role</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
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
  totalStaff = 0,
  activeStaff = 0,
  ownersCount = 0,
  inactiveStaff = 0,
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
  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<StaffItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StaffItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Filter logic
  const filtered = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "All" ||
      (filterStatus === "Active" && item.active) ||
      (filterStatus === "Inactive" && !item.active) ||
      (filterStatus === "Owner" && item.role === "owner") ||
      (filterStatus === "Staff" && item.role === "staff");
    return matchesSearch && matchesStatus;
  });

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleToggleActive = async (staff: StaffItem) => {
    setActiveMenuId(null);
    const prevItems = items;
    const newActive = !staff.active;
    setItems((prev) => prev.map((s) => (s.id === staff.id ? { ...s, active: newActive } : s)));
    try {
      const res = await toggleStaffActiveAction({
        staffId: staff.id,
        tenantId: tenantId ?? "",
        active: newActive,
      });
      if (!res.success) {
        setItems(prevItems);
        showToast(res.error || "Failed to update.");
        return;
      }
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
      const res = await deleteStaffMemberAction({
        staffId: target.id,
        tenantId: tenantId ?? "",
      });
      if (!res.success) {
        setItems(prevItems);
        showToast(res.error || "Failed to remove.");
        return;
      }
      showToast(`${target.fullName} removed.`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to remove.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title="Staff & Permissions"
            description="Manage your team, roles, and service assignments."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                  + Add Staff
                </AdminButton>
              </div>
            }
          />

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              label="Total staff"
              value={totalStaff}
              caption="All team members in your business"
              icon="users"
              progress={100}
            />
            <MetricCard
              label="Active members"
              value={activeStaff}
              caption="Currently active and accepting bookings"
              icon="verified"
              iconWeight="regular"
              progress={totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0}
            />
            <MetricCard
              label="Owners / admins"
              value={ownersCount}
              caption="Users with full management access"
              icon="shield"
              progress={totalStaff > 0 ? Math.round((ownersCount / totalStaff) * 100) : 0}
            />
            <MetricCard
              label="Inactive members"
              value={inactiveStaff}
              caption="Deactivated or on leave"
              icon="clock"
              progress={totalStaff > 0 ? Math.round((inactiveStaff / totalStaff) * 100) : 0}
            />
          </div>

          {/* Main Staff Surface */}
          <Surface className="overflow-hidden !p-0">
            {/* Controls Bar */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
              {/* Left: title + count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">Team Members</h2>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
                  {items.length} {items.length === 1 ? "member" : "members"}
                </span>
              </div>

              {/* Right: search + filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or title"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 w-48 sm:w-60 transition-shadow"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>

                {/* Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="h-11 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-glyph" aria-hidden>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filter</span>
                    <Icon name="chevron-down" className="size-3.5 text-glyph" />
                  </button>
                  {filterStatus !== "All" && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-burnt/10 px-2 py-1 text-xs font-semibold text-burnt">
                      {filterStatus}
                      <button type="button" onClick={() => setFilterStatus("All")} className="ml-0.5 hover:text-burnt-dark" aria-label="Clear filter">×</button>
                    </span>
                  )}
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-20 text-sm">
                      {["All", "Active", "Inactive", "Owner", "Staff"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setFilterStatus(s);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-mist ${filterStatus === s ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mobile cards ─────────────────────────────────────────── */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.length === 0 ? (
                <EmptyState
                  compact
                  title={
                    searchQuery || filterStatus !== "All"
                      ? "No staff match your search."
                      : "No staff members yet."
                  }
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
                              <p className="mt-0.5 text-sm text-muted">{row.title || "No title"}</p>
                            </div>
                          </div>
                          <ActiveBadge active={row.active} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 rounded-lg bg-powder p-4 text-sm text-muted">
                          <div className="grid grid-cols-2 gap-3">
                            <span>
                              Role
                              <strong className="mt-1 block text-ink capitalize">{row.role}</strong>
                            </span>
                            <span>
                              Status
                              <strong className="mt-1 block text-ink">{row.active ? "Active" : "Inactive"}</strong>
                            </span>
                          </div>
                          {row.bio && (
                            <div className="border-t border-hairline pt-3">
                              <p className="text-xs text-subtle">Bio</p>
                              <p className="text-sm text-ink mt-1">{row.bio}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                            <AdminButton size="xs" variant="outline" onClick={() => setEditTarget(row)}>
                              Edit
                            </AdminButton>
                            <AdminButton
                              size="xs"
                              variant="outline"
                              onClick={() => handleToggleActive(row)}
                            >
                              {row.active ? "Deactivate" : "Activate"}
                            </AdminButton>
                            <AdminButton size="xs" variant="danger" onClick={() => setDeleteTarget(row)}>
                              Remove
                            </AdminButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Desktop table ────────────────────────────────────────── */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    {["Member", "Title", "Role", "Status", "Joined", "Action"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] leading-4 uppercase tracking-wide ${i === 5 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-2">
                        <EmptyState
                          compact
                          title={
                            searchQuery || filterStatus !== "All"
                              ? "No staff match your search."
                              : "No staff members yet."
                          }
                          description="Add your first team member to get started."
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-mist transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-burnt/10 text-xs font-semibold text-burnt">
                              {getInitials(row.fullName)}
                            </div>
                            <span className="font-semibold text-ink">{row.fullName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted">{row.title || "—"}</td>
                        <td className="px-5 py-3.5">
                          <RolePill role={row.role} />
                        </td>
                        <td className="px-5 py-3.5">
                          <ActiveBadge active={row.active} />
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          {new Date(row.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === row.id ? null : row.id)
                            }
                            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph ml-auto"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>
                          {activeMenuId === row.id && (
                            <div className="absolute right-4 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTarget(row);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                              >
                                Edit details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(row)}
                                className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                              >
                                {row.active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget(row);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium"
                              >
                                Remove member
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {filtered.length} of {items.length}{" "}
                {items.length === 1 ? "member" : "members"}
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
        onCreated={(item) => {
          setItems((prev) => [item, ...prev]);
        }}
        showToast={showToast}
      />

      {/* ── Edit Staff Modal ───────────────────────────────────────────────── */}
      <EditStaffModal
        isOpen={!!editTarget}
        tenantId={tenantId}
        staff={editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={(updated) => {
          setItems((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        }}
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
              <AdminButton variant="outline" size="xs" onClick={() => setDeleteTarget(null)}>
                Keep
              </AdminButton>
              <AdminButton variant="danger" size="xs" onClick={handleConfirmDelete}>
                Confirm Remove
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
