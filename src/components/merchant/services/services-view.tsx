"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import { useSyncOnChange } from "@/lib/use-sync-on-change";
import { createPortal } from "react-dom";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import {
  archiveAddonAction,
  archivePackageAction,
  archiveServiceAction,
  createAddonAction,
  createPackageAction,
  createServiceAction,
  deleteAddonAction,
  deletePackageAction,
  deleteServiceAction,
  toggleAddonStatusAction,
  togglePackageStatusAction,
  toggleServiceStatusAction,
  unarchiveAddonAction,
  unarchivePackageAction,
  unarchiveServiceAction,
  updateAddonAction,
  updatePackageAction,
  updateServiceAction,
} from "@/app/actions/services";
import type {
  AddonDTO,
  PackageDTO,
  ServiceCategoryDTO,
  ServiceDTO,
  StaffOptionDTO,
} from "@/types/services";
import {
  AddonFormModal,
  PackageFormModal,
  ServiceFormModal,
} from "./service-modals";
import {
  ArchiveModal,
  BlockedDeleteModal,
  DeleteModal,
  SuccessFeedbackModal,
} from "./confirmation-modals";

// Hoisted constants to avoid React render-time infinite loop triggers
const EMPTY_SERVICES: ServiceDTO[] = [];
const EMPTY_PACKAGES: PackageDTO[] = [];
const EMPTY_ADDONS: AddonDTO[] = [];
const EMPTY_STAFF: StaffOptionDTO[] = [];
const EMPTY_CATEGORIES: ServiceCategoryDTO[] = [];

export interface ServicesViewProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantId: string;
  basePath?: string;
  initialServices?: ServiceDTO[];
  initialPackages?: PackageDTO[];
  initialAddons?: AddonDTO[];
  staff?: StaffOptionDTO[];
  categories?: ServiceCategoryDTO[];
}

type TabKey = "services" | "packages" | "addons" | "archived";
type StatusFilter = "all" | "active" | "inactive";

const visibilityOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Visibility" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Hidden only" },
];

function CatalogFilterSection<T extends string>({ title, options, value, onChange, open }: {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  open?: boolean;
}) {
  return (
    <details open={open} className="group border-b border-hairline last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="group-open:hidden">+</span>
        <span aria-hidden="true" className="hidden group-open:inline">−</span>
      </summary>
      <div className="pb-2" role="group" aria-label={title}>
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className="block w-full break-words px-4 py-2 text-left text-sm text-body hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt aria-pressed:font-semibold aria-pressed:text-burnt">
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

interface ToastState {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Helpers (Figma Reference Variation Aligned)
// ─────────────────────────────────────────────────────────────────────────────

function formatPeso(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDurationClean(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${mins} min`;
}

function formatBuffer(minutes: number | null | undefined): string {
  return `${minutes || 0} min`;
}

function formatEligibleStaff(assignedStaff: StaffOptionDTO[]): {
  label: string;
  tooltip?: string;
  isAssigned: boolean;
} {
  if (!assignedStaff || assignedStaff.length === 0) {
    return { label: "No staff assigned", isAssigned: false };
  }
  if (assignedStaff.length === 1) {
    return { label: assignedStaff[0].fullName, isAssigned: true };
  }
  const extra = assignedStaff.length - 1;
  const tooltip = assignedStaff.map((s) => s.fullName).join(", ");
  return {
    label: `${assignedStaff[0].fullName} +${extra}`,
    tooltip,
    isAssigned: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Figma-Aligned Interactive KPI View Switcher Card
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Portal-Based Floating Row Action Menu (No Table Overflow / Clipping)
// ─────────────────────────────────────────────────────────────────────────────
export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "warning" | "brand";
  dividerBefore?: boolean;
};

interface ActionMenuPortalProps {
  items: ActionMenuItem[];
  anchorRect: DOMRect;
  onClose: () => void;
}

function ActionMenuPortal({ items, anchorRect, onClose }: ActionMenuPortalProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Position calculation with automatic vertical flipping and viewport bounds
  const [style, setStyle] = React.useState<React.CSSProperties>(() => {
    const menuWidth = 176; // w-44 = 176px
    const estimatedHeight = 160;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - anchorRect.bottom : 200;
    const spaceAbove = typeof window !== "undefined" ? anchorRect.top : 200;
    const openUpward = spaceBelow < estimatedHeight + 8 && spaceAbove > spaceBelow;

    const top = openUpward ? anchorRect.top - 6 : anchorRect.bottom + 6;
    let left = typeof window !== "undefined" ? anchorRect.right - menuWidth : 0;
    if (left < 8) left = 8;
    if (typeof window !== "undefined" && left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      transform: openUpward ? "translateY(-100%)" : undefined,
      zIndex: 50,
    };
  });

  // Accurately refine coordinates once the menu node is measured in the DOM
  React.useLayoutEffect(() => {
    if (!menuRef.current) return;
    const menuEl = menuRef.current;
    const menuWidth = menuEl.offsetWidth || 176;
    const menuHeight = menuEl.offsetHeight || 160;

    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const openUpward = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;

    const top = openUpward ? anchorRect.top - 6 : anchorRect.bottom + 6;
    let left = anchorRect.right - menuWidth;

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      transform: openUpward ? "translateY(-100%)" : undefined,
      zIndex: 50,
    });
  }, [anchorRect]);

  // Close menu on outside click, Escape key, window resize, or table/window scroll
  React.useEffect(() => {
    const handleClose = () => onClose();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Capture phase for scroll to catch scrolls in table wrapper or any ancestor element
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={style}
      className="w-44 select-none rounded-[10px] border border-hairline bg-white py-1 shadow-lg"
      role="menu"
    >
      {items.map((item, idx) => {
        const colorClass =
          item.variant === "danger"
            ? "text-danger hover:bg-danger-bg"
            : item.variant === "warning"
            ? "text-warn-fg hover:bg-warn-bg"
            : item.variant === "brand"
            ? "text-burnt hover:bg-burnt/5"
            : "text-body hover:bg-mist";

        return (
          <React.Fragment key={idx}>
            {item.dividerBefore && (
              <div className="my-1 border-t border-hairline" />
            )}
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-burnt/40 ${colorClass} ${
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              role="menuitem"
            >
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ServicesView({
  businessName = "Merchant Workspace",
  userName = "Merchant",
  userEmail = "merchant@fides.ph",
  userRole = "Business owner",
  tenantId,
  basePath = "",
  initialServices = EMPTY_SERVICES,
  initialPackages = EMPTY_PACKAGES,
  initialAddons = EMPTY_ADDONS,
  staff = EMPTY_STAFF,
  categories = EMPTY_CATEGORIES,
}: ServicesViewProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [services, setServices] = React.useState<ServiceDTO[]>(initialServices);
  const [packages, setPackages] = React.useState<PackageDTO[]>(initialPackages);
  const [addons, setAddons] = React.useState<AddonDTO[]>(initialAddons);

  // Sync state if props change (e.g. from server revalidation)
  useSyncOnChange([initialServices], () => setServices(initialServices));
  useSyncOnChange([initialPackages], () => setPackages(initialPackages));
  useSyncOnChange([initialAddons], () => setAddons(initialAddons));

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [activeTab, setActiveTab] = React.useState<TabKey>("services");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [activeMenu, setActiveMenu] = React.useState<{
    id: string;
    items: ActionMenuItem[];
    anchorRect: DOMRect;
  } | null>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  const filterTriggerRef = React.useRef<HTMLButtonElement>(null);
  const filterPanelId = React.useId();
  const showCategoryFilter = activeTab === "services" && categories.length > 0;
  const hasActiveFilter = statusFilter !== "all" || (showCategoryFilter && categoryFilter !== "all");

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    items: ActionMenuItem[]
  ) => {
    e.stopPropagation();
    if (activeMenu?.id === id) {
      setActiveMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveMenu({ id, items, anchorRect: rect });
    }
  };

  // Close filter dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals state
  const [serviceModalOpen, setServiceModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ServiceDTO | null>(null);

  const [packageModalOpen, setPackageModalOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState<PackageDTO | null>(null);

  const [addonModalOpen, setAddonModalOpen] = React.useState(false);
  const [editingAddon, setEditingAddon] = React.useState<AddonDTO | null>(null);

  // Confirmation Modals State
  const [archiveTarget, setArchiveTarget] = React.useState<{
    item: ServiceDTO | PackageDTO | AddonDTO;
    type: "service" | "package" | "add-on";
    actionType?: "archive" | "hide";
  } | null>(null);

  const [successModal, setSuccessModal] = React.useState<{
    title: string;
    description: string;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<{
    item: ServiceDTO | PackageDTO | AddonDTO;
    type: "service" | "package" | "add-on";
  } | null>(null);

  const [blockedDeleteError, setBlockedDeleteError] = React.useState<{
    service: ServiceDTO;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [, setTogglingIds] = React.useState<Record<string, boolean>>({});

  // Local Toast notifications
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const showToast = React.useCallback(
    (type: "success" | "error" | "info", message: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  // ─── Filtered Data Calculations ───────────────────────────────────────────
  const nonArchivedServices = React.useMemo(
    () => services.filter((s) => !s.isArchived),
    [services]
  );
  const nonArchivedPackages = React.useMemo(
    () => packages.filter((p) => !p.isArchived),
    [packages]
  );
  const nonArchivedAddons = React.useMemo(
    () => addons.filter((a) => !a.isArchived),
    [addons]
  );

  const archivedItems = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: "service" | "package" | "add-on";
      durationFormatted: string;
      priceFormatted: string;
      rawItem: ServiceDTO | PackageDTO | AddonDTO;
      isArchived: boolean;
      active: boolean;
    }> = [];

    services
      .filter((s) => !s.active || s.isArchived)
      .forEach((s) =>
        list.push({
          id: s.id,
          name: s.name,
          type: "service",
          durationFormatted: formatDurationClean(s.durationMinutes),
          priceFormatted: formatPeso(s.priceCents),
          rawItem: s,
          isArchived: s.isArchived,
          active: s.active,
        })
      );

    packages
      .filter((p) => !p.active || p.isArchived)
      .forEach((p) =>
        list.push({
          id: p.id,
          name: p.name,
          type: "package",
          durationFormatted: formatDurationClean(p.durationMinutes),
          priceFormatted: formatPeso(p.priceCents),
          rawItem: p,
          isArchived: p.isArchived,
          active: p.active,
        })
      );

    addons
      .filter((a) => !a.active || a.isArchived)
      .forEach((a) =>
        list.push({
          id: a.id,
          name: a.name,
          type: "add-on",
          durationFormatted: `+${formatDurationClean(a.durationMinutes)}`,
          priceFormatted: formatPeso(a.priceCents),
          rawItem: a,
          isArchived: a.isArchived,
          active: a.active,
        })
      );

    return list;
  }, [services, packages, addons]);

  // KPI Calculations
  const activeServicesCount = nonArchivedServices.filter((s) => s.active).length;
  const totalPackagesCount = nonArchivedPackages.length;
  const totalAddonsCount = nonArchivedAddons.length;
  const inactiveOrArchivedCount =
    services.filter((s) => !s.active || s.isArchived).length +
    packages.filter((p) => !p.active || p.isArchived).length +
    addons.filter((a) => !a.active || a.isArchived).length;

  // Search filter
  const query = searchQuery.trim().toLowerCase();

  const filteredServices = React.useMemo(() => {
    return nonArchivedServices.filter((s) => {
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.active) ||
        (statusFilter === "inactive" && !s.active);

      const matchesCategory =
        categoryFilter === "all" || s.categoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [nonArchivedServices, query, statusFilter, categoryFilter]);

  const filteredPackages = React.useMemo(() => {
    return nonArchivedPackages.filter((p) => {
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.active) ||
        (statusFilter === "inactive" && !p.active);

      return matchesSearch && matchesStatus;
    });
  }, [nonArchivedPackages, query, statusFilter]);

  const filteredAddons = React.useMemo(() => {
    return nonArchivedAddons.filter((a) => {
      const matchesSearch =
        !query ||
        a.name.toLowerCase().includes(query) ||
        (a.description && a.description.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && a.active) ||
        (statusFilter === "inactive" && !a.active);

      return matchesSearch && matchesStatus;
    });
  }, [nonArchivedAddons, query, statusFilter]);

  const filteredArchived = React.useMemo(() => {
    return archivedItems.filter((item) => {
      return !query || item.name.toLowerCase().includes(query);
    });
  }, [archivedItems, query]);

  // ─── Service Action Handlers ───────────────────────────────────────────────

  const handleToggleService = async (service: ServiceDTO) => {
    const nextStatus = !service.active;
    setTogglingIds((prev) => ({ ...prev, [service.id]: true }));

    // Optimistic update
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, active: nextStatus } : s))
    );

    const res = await toggleServiceStatusAction(service.id, tenantId, nextStatus);
    setTogglingIds((prev) => ({ ...prev, [service.id]: false }));

    if (res.success) {
      if (nextStatus) {
        setSuccessModal({
          title: "Service Active",
          description: `“${service.name}” is now visible and bookable.`,
        });
      }
      showToast(
        "success",
        nextStatus
          ? `“${service.name}” is now active on your booking page.`
          : `“${service.name}” has been deactivated.`
      );
    } else {
      // Revert optimistic update
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: !nextStatus } : s))
      );
      showToast("error", res.error);
    }
  };

  const handleSaveService = async (data: {
    id?: string;
    name: string;
    description: string;
    durationMinutes: number;
    bufferMinutes: number;
    priceCents: number;
    categoryId: string | null;
    staffIds: string[];
    active: boolean;
  }) => {
    setIsSubmitting(true);
    if (data.id) {
      // Update
      const res = await updateServiceAction({
        id: data.id,
        tenantId,
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes,
        priceCents: data.priceCents,
        categoryId: data.categoryId,
        staffIds: data.staffIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (res.success) {
        setServices((prev) =>
          prev.map((s) => {
            if (s.id !== data.id) return s;
            const assignedStaff = staff.filter((st) => data.staffIds.includes(st.id));
            const category = categories.find((c) => c.id === data.categoryId);
            return {
              ...s,
              name: data.name,
              description: data.description,
              durationMinutes: data.durationMinutes,
              bufferMinutes: data.bufferMinutes,
              priceCents: data.priceCents,
              priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
              categoryId: data.categoryId,
              categoryName: category?.name || null,
              assignedStaff,
              assignedStaffIds: data.staffIds,
              active: data.active,
            };
          })
        );
        setServiceModalOpen(false);
        setEditingService(null);
        setSuccessModal({
          title: "Service Updated",
          description: `Changes to “${data.name}” have been saved.`,
        });
        showToast("success", "Service updated successfully.");
      } else {
        showToast("error", res.error);
      }
    } else {
      // Create
      const res = await createServiceAction({
        tenantId,
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes,
        priceCents: data.priceCents,
        categoryId: data.categoryId,
        staffIds: data.staffIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (!res.success) {
        showToast("error", res.error);
        return;
      }

      if (res.data) {
        const assignedStaff = staff.filter((st) => data.staffIds.includes(st.id));
        const category = categories.find((c) => c.id === data.categoryId);
        const newService: ServiceDTO = {
          id: res.data.id,
          tenantId,
          name: data.name,
          slug: data.name.toLowerCase().replace(/\s+/g, "-"),
          description: data.description,
          durationMinutes: data.durationMinutes,
          bufferMinutes: data.bufferMinutes,
          priceCents: data.priceCents,
          priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
          active: data.active,
          isArchived: false,
          categoryId: data.categoryId,
          categoryName: category?.name || null,
          assignedStaff,
          assignedStaffIds: data.staffIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setServices((prev) => [newService, ...prev]);
        setServiceModalOpen(false);
        setSuccessModal({
          title: "Service Created",
          description: `“${data.name}” has been added to your service catalog.`,
        });
        showToast("success", "Service created successfully.");
      }
    }
  };

  // ─── Package Action Handlers ───────────────────────────────────────────────

  const handleTogglePackage = async (pkg: PackageDTO) => {
    const nextStatus = !pkg.active;
    setTogglingIds((prev) => ({ ...prev, [pkg.id]: true }));

    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, active: nextStatus } : p))
    );

    const res = await togglePackageStatusAction(pkg.id, tenantId, nextStatus);
    setTogglingIds((prev) => ({ ...prev, [pkg.id]: false }));

    if (res.success) {
      if (nextStatus) {
        setSuccessModal({
          title: "Package Active",
          description: `“${pkg.name}” is now visible and bookable.`,
        });
      }
      showToast(
        "success",
        nextStatus ? `“${pkg.name}” is now active.` : `“${pkg.name}” deactivated.`
      );
    } else {
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, active: !nextStatus } : p))
      );
      showToast("error", res.error);
    }
  };

  const handleSavePackage = async (data: {
    id?: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
    serviceIds: string[];
    active: boolean;
  }) => {
    setIsSubmitting(true);
    if (data.id) {
      const res = await updatePackageAction({
        id: data.id,
        tenantId,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        durationMinutes: data.durationMinutes,
        serviceIds: data.serviceIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (res.success) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id !== data.id) return p;
            const bundled = services
              .filter((s) => data.serviceIds.includes(s.id))
              .map((s) => ({
                id: s.id,
                name: s.name,
                priceCents: s.priceCents,
                durationMinutes: s.durationMinutes,
                quantity: 1,
              }));
            return {
              ...p,
              name: data.name,
              description: data.description,
              priceCents: data.priceCents,
              priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
              durationMinutes: data.durationMinutes,
              bundledServices: bundled,
              bundledServiceIds: data.serviceIds,
              active: data.active,
            };
          })
        );
        setPackageModalOpen(false);
        setEditingPackage(null);
        setSuccessModal({
          title: "Package Updated",
          description: `Changes to “${data.name}” have been saved.`,
        });
        showToast("success", "Package updated successfully.");
      } else {
        showToast("error", res.error);
      }
    } else {
      const res = await createPackageAction({
        tenantId,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        durationMinutes: data.durationMinutes,
        serviceIds: data.serviceIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (!res.success) {
        showToast("error", res.error);
        return;
      }

      if (res.data) {
        const bundled = services
          .filter((s) => data.serviceIds.includes(s.id))
          .map((s) => ({
            id: s.id,
            name: s.name,
            priceCents: s.priceCents,
            durationMinutes: s.durationMinutes,
            quantity: 1,
          }));
        const newPkg: PackageDTO = {
          id: res.data.id,
          tenantId,
          name: data.name,
          slug: data.name.toLowerCase().replace(/\s+/g, "-"),
          description: data.description,
          priceCents: data.priceCents,
          priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
          durationMinutes: data.durationMinutes,
          bundledServices: bundled,
          bundledServiceIds: data.serviceIds,
          active: data.active,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setPackages((prev) => [newPkg, ...prev]);
        setPackageModalOpen(false);
        setSuccessModal({
          title: "Package Created",
          description: `“${data.name}” has been created.`,
        });
        showToast("success", "Package created successfully.");
      }
    }
  };

  // ─── Add-on Action Handlers ────────────────────────────────────────────────

  const handleToggleAddon = async (addon: AddonDTO) => {
    const nextStatus = !addon.active;
    setTogglingIds((prev) => ({ ...prev, [addon.id]: true }));

    setAddons((prev) =>
      prev.map((a) => (a.id === addon.id ? { ...a, active: nextStatus } : a))
    );

    const res = await toggleAddonStatusAction(addon.id, tenantId, nextStatus);
    setTogglingIds((prev) => ({ ...prev, [addon.id]: false }));

    if (res.success) {
      if (nextStatus) {
        setSuccessModal({
          title: "Add-on Active",
          description: `“${addon.name}” is now visible and bookable.`,
        });
      }
      showToast(
        "success",
        nextStatus ? `“${addon.name}” is now active.` : `“${addon.name}” deactivated.`
      );
    } else {
      setAddons((prev) =>
        prev.map((a) => (a.id === addon.id ? { ...a, active: !nextStatus } : a))
      );
      showToast("error", res.error);
    }
  };

  const handleSaveAddon = async (data: {
    id?: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
    applicableServiceIds?: string[];
    active: boolean;
  }) => {
    setIsSubmitting(true);
    if (data.id) {
      const res = await updateAddonAction({
        id: data.id,
        tenantId,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        durationMinutes: data.durationMinutes,
        applicableServiceIds: data.applicableServiceIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (res.success) {
        setAddons((prev) =>
          prev.map((a) => {
            if (a.id !== data.id) return a;
            return {
              ...a,
              name: data.name,
              description: data.description,
              priceCents: data.priceCents,
              priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
              durationMinutes: data.durationMinutes,
              linkedServiceIds: data.applicableServiceIds || [],
              linkedServicesCount: (data.applicableServiceIds || []).length,
              active: data.active,
            };
          })
        );
        setAddonModalOpen(false);
        setEditingAddon(null);
        setSuccessModal({
          title: "Add-on Updated",
          description: `Changes to “${data.name}” have been saved.`,
        });
        showToast("success", "Add-on updated successfully.");
      } else {
        showToast("error", res.error);
      }
    } else {
      const res = await createAddonAction({
        tenantId,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        durationMinutes: data.durationMinutes,
        applicableServiceIds: data.applicableServiceIds,
        active: data.active,
      });
      setIsSubmitting(false);

      if (!res.success) {
        showToast("error", res.error);
        return;
      }

      if (res.data) {
        const newAddon: AddonDTO = {
          id: res.data.id,
          tenantId,
          name: data.name,
          description: data.description,
          priceCents: data.priceCents,
          priceFormatted: `₱${(data.priceCents / 100).toLocaleString("en-PH")}`,
          durationMinutes: data.durationMinutes,
          linkedServiceIds: data.applicableServiceIds || [],
          linkedServicesCount: (data.applicableServiceIds || []).length,
          active: data.active,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAddons((prev) => [newAddon, ...prev]);
        setAddonModalOpen(false);
        setSuccessModal({
          title: "Add-on Created",
          description: `“${data.name}” has been created.`,
        });
        showToast("success", "Add-on created successfully.");
      }
    }
  };

  // ─── Archive & Delete Confirmations ────────────────────────────────────────

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setIsSubmitting(true);
    const { item, type, actionType = "archive" } = archiveTarget;

    if (actionType === "hide") {
      if (type === "service") {
        const res = await toggleServiceStatusAction(item.id, tenantId, false);
        setIsSubmitting(false);
        if (res.success) {
          setServices((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, active: false } : s))
          );
          setArchiveTarget(null);
          setSuccessModal({
            title: "Service Hidden",
            description: `“${item.name}” is now hidden from your public booking menu.`,
          });
          showToast("success", `“${item.name}” hidden.`);
        } else {
          showToast("error", res.error);
        }
      } else if (type === "package") {
        const res = await togglePackageStatusAction(item.id, tenantId, false);
        setIsSubmitting(false);
        if (res.success) {
          setPackages((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, active: false } : p))
          );
          setArchiveTarget(null);
          setSuccessModal({
            title: "Package Hidden",
            description: `“${item.name}” is now hidden from your public booking menu.`,
          });
          showToast("success", `“${item.name}” hidden.`);
        } else {
          showToast("error", res.error);
        }
      } else if (type === "add-on") {
        const res = await toggleAddonStatusAction(item.id, tenantId, false);
        setIsSubmitting(false);
        if (res.success) {
          setAddons((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, active: false } : a))
          );
          setArchiveTarget(null);
          setSuccessModal({
            title: "Add-on Hidden",
            description: `“${item.name}” is now hidden from your public booking menu.`,
          });
          showToast("success", `“${item.name}” hidden.`);
        } else {
          showToast("error", res.error);
        }
      }
      return;
    }

    if (type === "service") {
      const res = await archiveServiceAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === item.id ? { ...s, isArchived: true, active: false } : s
          )
        );
        setArchiveTarget(null);
        setServiceModalOpen(false);
        setEditingService(null);
        setSuccessModal({
          title: "Service Archived",
          description: `“${item.name}” has been hidden and archived.`,
        });
        showToast("success", `“${item.name}” moved to Archived.`);
      } else {
        showToast("error", res.error);
      }
    } else if (type === "package") {
      const res = await archivePackageAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, isArchived: true, active: false } : p
          )
        );
        setArchiveTarget(null);
        setPackageModalOpen(false);
        setEditingPackage(null);
        setSuccessModal({
          title: "Package Archived",
          description: `“${item.name}” has been hidden and archived.`,
        });
        showToast("success", `“${item.name}” moved to Archived.`);
      } else {
        showToast("error", res.error);
      }
    } else if (type === "add-on") {
      const res = await archiveAddonAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setAddons((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, isArchived: true, active: false } : a
          )
        );
        setArchiveTarget(null);
        setAddonModalOpen(false);
        setEditingAddon(null);
        setSuccessModal({
          title: "Add-on Archived",
          description: `“${item.name}” has been hidden and archived.`,
        });
        showToast("success", `“${item.name}” moved to Archived.`);
      } else {
        showToast("error", res.error);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    const { item, type } = deleteTarget;

    if (type === "service") {
      const res = await deleteServiceAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setServices((prev) => prev.filter((s) => s.id !== item.id));
        setDeleteTarget(null);
        setServiceModalOpen(false);
        setEditingService(null);
        setSuccessModal({
          title: "Service Deleted",
          description: `“${item.name}” was permanently deleted.`,
        });
        showToast("success", `“${item.name}” was permanently deleted.`);
      } else {
        setDeleteTarget(null);
        if (res.isLinkedToAppointments) {
          setBlockedDeleteError({
            service: item as ServiceDTO,
            message: res.error,
          });
        } else {
          showToast("error", res.error);
        }
      }
    } else if (type === "package") {
      const res = await deletePackageAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setPackages((prev) => prev.filter((p) => p.id !== item.id));
        setDeleteTarget(null);
        setPackageModalOpen(false);
        setEditingPackage(null);
        setSuccessModal({
          title: "Package Deleted",
          description: `“${item.name}” was permanently deleted.`,
        });
        showToast("success", `“${item.name}” was permanently deleted.`);
      } else {
        showToast("error", res.error);
      }
    } else if (type === "add-on") {
      const res = await deleteAddonAction(item.id, tenantId);
      setIsSubmitting(false);
      if (res.success) {
        setAddons((prev) => prev.filter((a) => a.id !== item.id));
        setDeleteTarget(null);
        setAddonModalOpen(false);
        setEditingAddon(null);
        setSuccessModal({
          title: "Add-on Deleted",
          description: `“${item.name}” was permanently deleted.`,
        });
        showToast("success", `“${item.name}” was permanently deleted.`);
      } else {
        showToast("error", res.error);
      }
    }
  };

  const handleRestoreArchived = async (item: ServiceDTO | PackageDTO | AddonDTO, type: "service" | "package" | "add-on") => {
    if (type === "service") {
      const res = await unarchiveServiceAction(item.id, tenantId);
      if (res.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, isArchived: false, active: true } : s))
        );
        setSuccessModal({
          title: "Service Restored",
          description: `“${item.name}” has been restored to your service catalog.`,
        });
        showToast("success", `“${item.name}” restored to Services catalog.`);
      } else {
        showToast("error", res.error);
      }
    } else if (type === "package") {
      const res = await unarchivePackageAction(item.id, tenantId);
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isArchived: false, active: true } : p))
        );
        setSuccessModal({
          title: "Package Restored",
          description: `“${item.name}” has been restored to Packages.`,
        });
        showToast("success", `“${item.name}” restored to Packages.`);
      } else {
        showToast("error", res.error);
      }
    } else if (type === "add-on") {
      const res = await unarchiveAddonAction(item.id, tenantId);
      if (res.success) {
        setAddons((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, isArchived: false, active: true } : a))
        );
        setSuccessModal({
          title: "Add-on Restored",
          description: `“${item.name}” has been restored to Add-ons.`,
        });
        showToast("success", `“${item.name}” restored to Add-ons.`);
      } else {
        showToast("error", res.error);
      }
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Merchant Sidebar with Services tab wired */}
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          <PageHeading
            title="Services"
            description="Build your service menu, bundles, and optional add-ons."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="brand" size="form"
                  onClick={() => {
                    setEditingService(null);
                    setServiceModalOpen(true);
                  }}
                >
                  + Add Service
                </Button>
                <Button variant="brand" size="form"
                  onClick={() => {
                    setEditingAddon(null);
                    setAddonModalOpen(true);
                  }}
                >
                  + Add Add-on
                </Button>
                <Button variant="secondary" size="form"
                  onClick={() => {
                    setEditingPackage(null);
                    setPackageModalOpen(true);
                  }}
                >
                  + Create Package
                </Button>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              label="Active services"
              value={activeServicesCount}
              caption="Visible and bookable"
              icon="layers"
              progress={100}
              featured={activeTab === "services"}
              pressed={activeTab === "services"}
              onClick={() => setActiveTab("services")}
            />
            <MetricCard
              label="Packages"
              value={totalPackagesCount}
              caption="View and manage bundles"
              icon="layers"
              progress={100}
              featured={activeTab === "packages"}
              pressed={activeTab === "packages"}
              onClick={() => setActiveTab("packages")}
            />
            <MetricCard
              label="Add-ons"
              value={totalAddonsCount}
              caption="Extra time and service value"
              icon="check"
              progress={100}
              featured={activeTab === "addons"}
              pressed={activeTab === "addons"}
              onClick={() => setActiveTab("addons")}
            />
            <MetricCard
              label="Hidden services"
              value={inactiveOrArchivedCount}
              caption="Not bookable · Records kept"
              icon="alert"
              progress={100}
              featured={activeTab === "archived"}
              pressed={activeTab === "archived"}
              onClick={() => setActiveTab("archived")}
            />
          </div>

          <Surface className="!p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Icon name="layers" className="size-5 text-glyph" />
                <h2 className="text-base font-semibold leading-6 text-ink">
                  {activeTab === "services" && "Service Catalog"}
                  {activeTab === "packages" && "Packages"}
                  {activeTab === "addons" && "Add-Ons"}
                  {activeTab === "archived" && "Hidden Services"}
                </h2>
              </div>

              {/* Right: Search service input + single Filter dropdown button */}
              <div className="flex w-full items-center gap-2.5 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-60">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-3.5 size-4 text-glyph"
                  />
                  <input
                    type="text"
                    aria-label="Search catalog"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === "services"
                        ? "Search service..."
                        : activeTab === "packages"
                        ? "Search package..."
                        : activeTab === "addons"
                        ? "Search add-on..."
                        : "Search hidden..."
                    }
                    className="h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-9 text-sm text-ink placeholder:text-glyph transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Clear catalog search"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-glyph hover:bg-mist hover:text-ink"
                    >
                      <Icon name="close" className="size-3.5" />
                    </button>
                  )}
                </div>

                {activeTab !== "archived" && (
                  <div
                    className="relative shrink-0"
                    ref={filterDropdownRef}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape" || !filterOpen) return;
                      event.stopPropagation();
                      setFilterOpen(false);
                      filterTriggerRef.current?.focus();
                    }}
                  >
                    <button
                      type="button"
                      ref={filterTriggerRef}
                      aria-expanded={filterOpen}
                      aria-controls={filterPanelId}
                      onClick={() => setFilterOpen((open) => !open)}
                      className={`inline-flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                        filterOpen || hasActiveFilter ? "border-burnt" : "border-hairline"
                      }`}
                    >
                      <Icon name="filter" className="size-3.5 text-glyph" />
                      <span>Filter</span>
                      {hasActiveFilter && (
                        <span className="size-1.5 rounded-full bg-burnt" role="img" aria-label="Filters applied" />
                      )}
                      <Icon name="chevron-down" className={`size-3.5 text-glyph transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                    </button>

                    {filterOpen && (
                      <div id={filterPanelId} className="absolute right-0 z-30 mt-1 max-h-[min(60dvh,24rem)] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[10px] border border-hairline bg-white shadow-lg">
                        <CatalogFilterSection title="Visibility" options={visibilityOptions} value={statusFilter} onChange={setStatusFilter} open />
                        {showCategoryFilter && (
                          <CatalogFilterSection
                            title="Category"
                            options={[{ value: "all", label: "All Categories" }, ...categories.map(({ id, name }) => ({ value: id, label: name }))]}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            open={categoryFilter !== "all"}
                          />
                        )}
                        {hasActiveFilter && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("all");
                              setCategoryFilter("all");
                              filterTriggerRef.current?.focus();
                            }}
                            className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-burnt hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Responsive Table Wrapper */}
            <div className="w-full overflow-x-auto">
              {/* 1. SERVICES TAB TABLE (8 Columns strictly matching Figma) */}
              {activeTab === "services" && (
                <>
                  {filteredServices.length === 0 ? (
                    <div className="px-5 py-6 text-center sm:py-8">
                      <EmptyState
                        compact
                        title={
                          searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                            ? "No matching services"
                            : "No services yet"
                        }
                        description={
                          searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                            ? "No services match your active search or filter criteria. Clear filters to view all services."
                            : "Start adding services to your catalog so clients can book appointments online."
                        }
                      />
                      {searchQuery || statusFilter !== "all" || categoryFilter !== "all" ? (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                            setCategoryFilter("all");
                          }}
                        >
                          Reset filters
                        </Button>
                      ) : (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setEditingService(null);
                            setServiceModalOpen(true);
                          }}
                        >
                          + Add Service
                        </Button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase tracking-wide text-subtle">
                          <th className="px-5 py-3">Service</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Duration</th>
                          <th className="px-5 py-3">Buffer</th>
                          <th className="px-5 py-3">Base price</th>
                          <th className="px-5 py-3">Eligible staff</th>
                          <th className="px-5 py-3 text-center">Visibility</th>
                          <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {filteredServices.map((service) => {
                          const staffInfo = formatEligibleStaff(service.assignedStaff);
                          return (
                            <tr
                              key={service.id}
                              className="transition-colors hover:bg-mist"
                            >
                              <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">
                                {service.name}
                              </td>
                              <td className="px-5 py-3.5 text-muted whitespace-nowrap">
                                {service.categoryName || "—"}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap font-medium text-body">
                                {formatDurationClean(service.durationMinutes)}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-muted">
                                {formatBuffer(service.bufferMinutes)}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-ink">
                                {formatPeso(service.priceCents)}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-body">
                                {staffInfo.isAssigned ? (
                                  <span title={staffInfo.tooltip}>{staffInfo.label}</span>
                                ) : (
                                  <span className="text-glyph italic">No staff assigned</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <StatusPill tone={service.active ? "success" : "warning"}>
                                  {service.active ? "Active" : "Hidden"}
                                </StatusPill>
                              </td>
                              <td className="px-5 py-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleOpenMenu(e, service.id, [
                                      {
                                        label: "Edit",
                                        onClick: () => {
                                          setEditingService(service);
                                          setServiceModalOpen(true);
                                        },
                                      },
                                      {
                                        label: "Hide service",
                                        onClick: () =>
                                          setArchiveTarget({
                                            item: service,
                                            type: "service",
                                            actionType: "hide",
                                          }),
                                      },
                                      {
                                        label: "Archive",
                                        variant: "warning",
                                        onClick: () =>
                                          setArchiveTarget({
                                            item: service,
                                            type: "service",
                                            actionType: "archive",
                                          }),
                                      },
                                      {
                                        label: "Delete",
                                        variant: "danger",
                                        dividerBefore: true,
                                        onClick: () =>
                                          setDeleteTarget({ item: service, type: "service" }),
                                      },
                                    ])
                                  }
                                  className={`mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                                    activeMenu?.id === service.id ? "bg-mist text-ink" : "text-glyph hover:bg-mist hover:text-ink"
                                  }`}
                                  aria-label="Actions"
                                  aria-expanded={activeMenu?.id === service.id}
                                >
                                  <Icon name="more" weight="fill" className="size-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* 2. PACKAGES TAB TABLE */}
              {activeTab === "packages" && (
                <>
                  {filteredPackages.length === 0 ? (
                    <div className="px-5 py-6 text-center sm:py-8">
                      <EmptyState
                        compact
                        title={
                          searchQuery || statusFilter !== "all"
                            ? "No matching packages"
                            : "No packages created"
                        }
                        description={
                          searchQuery || statusFilter !== "all"
                            ? "No packages match your search keywords or active filters."
                            : "Bundle complementary services together at a bundle price to boost sales."
                        }
                      />
                      {searchQuery || statusFilter !== "all" ? (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                        >
                          Reset filters
                        </Button>
                      ) : (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setEditingPackage(null);
                            setPackageModalOpen(true);
                          }}
                        >
                          + Create Package
                        </Button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase tracking-wide text-subtle">
                          <th className="px-5 py-3">Package</th>
                          <th className="px-5 py-3">Bundled services</th>
                          <th className="px-5 py-3">Duration</th>
                          <th className="px-5 py-3">Base price</th>
                          <th className="px-5 py-3 text-center">Visibility</th>
                          <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {filteredPackages.map((pkg) => (
                          <tr key={pkg.id} className="transition-colors hover:bg-mist">
                            <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">
                              {pkg.name}
                            </td>
                            <td className="px-5 py-3.5 text-muted whitespace-nowrap">
                              {pkg.bundledServices.length > 0
                                ? pkg.bundledServices.map((b) => b.name).join(" + ")
                                : "No bundled items"}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-medium text-body">
                              {formatDurationClean(pkg.durationMinutes)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-ink">
                              {formatPeso(pkg.priceCents)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <StatusPill tone={pkg.active ? "success" : "warning"}>
                                {pkg.active ? "Active" : "Hidden"}
                              </StatusPill>
                            </td>
                            <td className="px-5 py-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleOpenMenu(e, pkg.id, [
                                      {
                                        label: "Edit",
                                        onClick: () => {
                                          setEditingPackage(pkg);
                                          setPackageModalOpen(true);
                                        },
                                      },
                                      {
                                        label: pkg.active ? "Hide package" : "Show package",
                                        onClick: () => {
                                          if (pkg.active) {
                                            setArchiveTarget({
                                              item: pkg,
                                              type: "package",
                                              actionType: "hide",
                                            });
                                          } else {
                                            void handleTogglePackage(pkg);
                                          }
                                        },
                                      },
                                      {
                                        label: "Archive",
                                        variant: "warning",
                                        onClick: () =>
                                          setArchiveTarget({
                                            item: pkg,
                                            type: "package",
                                            actionType: "archive",
                                          }),
                                      },
                                      {
                                        label: "Delete",
                                        variant: "danger",
                                        dividerBefore: true,
                                        onClick: () =>
                                          setDeleteTarget({ item: pkg, type: "package" }),
                                      },
                                    ])
                                  }
                                  className={`mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                                    activeMenu?.id === pkg.id ? "bg-mist text-ink" : "text-glyph hover:bg-mist hover:text-ink"
                                  }`}
                                  aria-label="Actions"
                                  aria-expanded={activeMenu?.id === pkg.id}
                                >
                                  <Icon name="more" weight="fill" className="size-5" />
                                </button>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* 3. ADD-ONS TAB TABLE */}
              {activeTab === "addons" && (
                <>
                  {filteredAddons.length === 0 ? (
                    <div className="px-5 py-6 text-center sm:py-8">
                      <EmptyState
                        compact
                        title={
                          searchQuery || statusFilter !== "all"
                            ? "No matching add-ons"
                            : "No add-ons created"
                        }
                        description={
                          searchQuery || statusFilter !== "all"
                            ? "No add-ons match your search keywords or active filters."
                            : "Create optional add-ons (scalp massage, conditioning, nail art) that customers can attach to bookings."
                        }
                      />
                      {searchQuery || statusFilter !== "all" ? (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                        >
                          Reset filters
                        </Button>
                      ) : (
                        <Button variant="brand" size="xs"
                          type="button"
                          onClick={() => {
                            setEditingAddon(null);
                            setAddonModalOpen(true);
                          }}
                        >
                          + Add Add-on
                        </Button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase tracking-wide text-subtle">
                          <th className="px-5 py-3">Add-on</th>
                          <th className="px-5 py-3">Applicability</th>
                          <th className="px-5 py-3">Extra duration</th>
                          <th className="px-5 py-3">Extra price</th>
                          <th className="px-5 py-3 text-center">Visibility</th>
                          <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {filteredAddons.map((addon) => (
                          <tr
                            key={addon.id}
                            className="transition-colors hover:bg-mist"
                          >
                            <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">
                              {addon.name}
                            </td>
                            <td className="px-5 py-3.5 text-muted whitespace-nowrap">
                              {addon.linkedServiceIds.length === 0
                                ? "All services"
                                : `${addon.linkedServiceIds.length} specific services`}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-medium text-body">
                              +{formatDurationClean(addon.durationMinutes)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-ink">
                              +{formatPeso(addon.priceCents)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <StatusPill tone={addon.active ? "success" : "warning"}>
                                {addon.active ? "Active" : "Hidden"}
                              </StatusPill>
                            </td>
                            <td className="px-5 py-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleOpenMenu(e, addon.id, [
                                      {
                                        label: "Edit",
                                        onClick: () => {
                                          setEditingAddon(addon);
                                          setAddonModalOpen(true);
                                        },
                                      },
                                      {
                                        label: addon.active ? "Hide add-on" : "Show add-on",
                                        onClick: () => {
                                          if (addon.active) {
                                            setArchiveTarget({
                                              item: addon,
                                              type: "add-on",
                                              actionType: "hide",
                                            });
                                          } else {
                                            void handleToggleAddon(addon);
                                          }
                                        },
                                      },
                                      {
                                        label: "Archive",
                                        variant: "warning",
                                        onClick: () =>
                                          setArchiveTarget({
                                            item: addon,
                                            type: "add-on",
                                            actionType: "archive",
                                          }),
                                      },
                                      {
                                        label: "Delete",
                                        variant: "danger",
                                        dividerBefore: true,
                                        onClick: () =>
                                          setDeleteTarget({ item: addon, type: "add-on" }),
                                      },
                                    ])
                                  }
                                  className={`mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                                    activeMenu?.id === addon.id ? "bg-mist text-ink" : "text-glyph hover:bg-mist hover:text-ink"
                                  }`}
                                  aria-label="Actions"
                                  aria-expanded={activeMenu?.id === addon.id}
                                >
                                  <Icon name="more" weight="fill" className="size-5" />
                                </button>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* 4. HIDDEN SERVICES TAB TABLE */}
              {activeTab === "archived" && (
                <>
                  {filteredArchived.length === 0 ? (
                    <EmptyState
                      compact
                      title="No hidden services"
                      description="When you deactivate or archive services, packages, or add-ons, they will appear here so you can reactivate or restore them anytime."
                      className="py-16"
                    />
                  ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase tracking-wide text-subtle">
                          <th className="px-5 py-3">Item</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Duration</th>
                          <th className="px-5 py-3">Base price</th>
                          <th className="px-5 py-3 text-center">Status</th>
                          <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {filteredArchived.map((item) => (
                          <tr key={item.id} className="transition-colors hover:bg-mist">
                            <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">
                              {item.name}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-block rounded-md bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-body">
                                {item.type}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-medium text-muted">
                              {item.durationFormatted}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-ink">
                              {item.priceFormatted}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <StatusPill tone={item.isArchived ? "neutral" : "warning"}>
                                {item.isArchived ? "Archived" : "Hidden"}
                              </StatusPill>
                            </td>
                            <td className="px-5 py-3.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleOpenMenu(e, item.id, [
                                      {
                                        label: "Edit",
                                        onClick: () => {
                                          if (item.type === "service") {
                                            setEditingService(item.rawItem as ServiceDTO);
                                            setServiceModalOpen(true);
                                          } else if (item.type === "package") {
                                            setEditingPackage(item.rawItem as PackageDTO);
                                            setPackageModalOpen(true);
                                          } else {
                                            setEditingAddon(item.rawItem as AddonDTO);
                                            setAddonModalOpen(true);
                                          }
                                        },
                                      },
                                      {
                                        label: "Restore / Set Active",
                                        variant: "brand" as const,
                                        onClick: () => {
                                          if (item.isArchived) {
                                            void handleRestoreArchived(item.rawItem, item.type);
                                          } else {
                                            if (item.type === "service") {
                                              void handleToggleService(item.rawItem as ServiceDTO);
                                            } else if (item.type === "package") {
                                              void handleTogglePackage(item.rawItem as PackageDTO);
                                            } else {
                                              void handleToggleAddon(item.rawItem as AddonDTO);
                                            }
                                          }
                                        },
                                      },
                                      {
                                        label: "Delete",
                                        variant: "danger" as const,
                                        dividerBefore: true,
                                        onClick: () => setDeleteTarget({ item: item.rawItem, type: item.type }),
                                      },
                                    ])
                                  }
                                  className={`mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                                    activeMenu?.id === item.id ? "bg-mist text-ink" : "text-glyph hover:bg-mist hover:text-ink"
                                  }`}
                                  aria-label="Actions"
                                  aria-expanded={activeMenu?.id === item.id}
                                >
                                  <Icon name="more" weight="fill" className="size-5" />
                                </button>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>

            {/* Footer Notes (inside bottom of the white card, strictly matching Figma) */}
            <div className="space-y-1 rounded-b-[10px] border-t border-hairline p-4 text-xs text-muted sm:p-6">
              <p>
                <strong className="font-semibold text-body">Active:</strong> visible and bookable.{" "}
                <strong className="font-semibold text-body">Hidden:</strong> unavailable for new bookings; existing appointments and records are kept.
              </p>
              <p>
                Base prices are shown in Philippine pesos with two decimals and include VAT in this billing configuration.
              </p>
            </div>
          </Surface>
        </PageContent>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Add / Edit Service Modal */}
      <ServiceFormModal
        isOpen={serviceModalOpen}
        onClose={() => {
          setServiceModalOpen(false);
          setEditingService(null);
        }}
        onSubmit={handleSaveService}
        onArchive={(srv) => {
          setServiceModalOpen(false);
          setArchiveTarget({ item: srv, type: "service" });
        }}
        onDelete={(srv) => {
          setServiceModalOpen(false);
          setDeleteTarget({ item: srv, type: "service" });
        }}
        initialService={editingService}
        categories={categories}
        staff={staff}
        isLoading={isSubmitting}
      />

      {/* Add / Edit Package Modal */}
      <PackageFormModal
        isOpen={packageModalOpen}
        onClose={() => {
          setPackageModalOpen(false);
          setEditingPackage(null);
        }}
        onSubmit={handleSavePackage}
        onArchive={(pkg) => {
          setPackageModalOpen(false);
          setArchiveTarget({ item: pkg, type: "package" });
        }}
        onDelete={(pkg) => {
          setPackageModalOpen(false);
          setDeleteTarget({ item: pkg, type: "package" });
        }}
        initialPackage={editingPackage}
        availableServices={nonArchivedServices}
        isLoading={isSubmitting}
      />

      {/* Add / Edit Add-on Modal */}
      <AddonFormModal
        isOpen={addonModalOpen}
        onClose={() => {
          setAddonModalOpen(false);
          setEditingAddon(null);
        }}
        onSubmit={handleSaveAddon}
        onArchive={(addon) => {
          setAddonModalOpen(false);
          setArchiveTarget({ item: addon, type: "add-on" });
        }}
        onDelete={(addon) => {
          setAddonModalOpen(false);
          setDeleteTarget({ item: addon, type: "add-on" });
        }}
        initialAddon={editingAddon}
        availableServices={nonArchivedServices}
        isLoading={isSubmitting}
      />

      {/* Archive / Hide Confirmation Modal */}
      <ArchiveModal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        title={archiveTarget?.item.name || ""}
        itemType={archiveTarget?.type}
        actionType={archiveTarget?.actionType || "archive"}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.item.name || ""}
        itemType={deleteTarget?.type}
        isLoading={isSubmitting}
      />

      {/* Cannot Delete (Blocked by Appointments) Modal */}
      <BlockedDeleteModal
        isOpen={Boolean(blockedDeleteError)}
        onClose={() => setBlockedDeleteError(null)}
        onArchiveInstead={async () => {
          if (!blockedDeleteError) return;
          const srv = blockedDeleteError.service;
          setBlockedDeleteError(null);
          setIsSubmitting(true);
          const res = await archiveServiceAction(srv.id, tenantId);
          setIsSubmitting(false);
          if (res.success) {
            setServices((prev) =>
              prev.map((s) =>
                s.id === srv.id ? { ...s, isArchived: true, active: false } : s
              )
            );
            setSuccessModal({
              title: "Service Archived",
              description: `“${srv.name}” has been archived instead to keep appointment records safe.`,
            });
            showToast("success", `“${srv.name}” moved to Archived.`);
          } else {
            showToast("error", res.error);
          }
        }}
        title={blockedDeleteError?.service.name || ""}
        errorMessage={blockedDeleteError?.message}
        isLoading={isSubmitting}
      />

      {/* Success Feedback Modal (Figma Aligned) */}
      <SuccessFeedbackModal
        isOpen={Boolean(successModal)}
        onClose={() => setSuccessModal(null)}
        title={successModal?.title || "Success"}
        description={successModal?.description || ""}
      />

            {/* Floating Action Menu Portal (Rendered outside table wrapper to prevent clipping & scrollbars) */}
      {mounted && activeMenu && createPortal(
        <ActionMenuPortal
          items={activeMenu.items}
          anchorRect={activeMenu.anchorRect}
          onClose={() => setActiveMenu(null)}
        />,
        document.body
      )}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className={`pointer-events-none fixed inset-x-4 z-50 flex max-w-sm flex-col gap-2 sm:left-auto sm:w-full ${
          serviceModalOpen || packageModalOpen || addonModalOpen
            ? "bottom-[calc(4dvh+9rem)] sm:bottom-[calc(4dvh+6rem)] xl:bottom-4"
            : "bottom-4"
        }`}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-lg border p-3.5 text-xs font-medium shadow-lg ${
                t.type === "error"
                  ? "bg-danger-dark/90 border-danger-dark text-white"
                  : t.type === "success"
                  ? "bg-ink/90 border-body text-white"
                  : "bg-ink/90 border-body text-mist"
              }`}
            >
              <div className="flex-1">{t.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
