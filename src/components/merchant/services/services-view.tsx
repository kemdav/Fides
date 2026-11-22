"use client";

import * as React from "react";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
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

interface ToastState {
  id: string;
  type: "success" | "error" | "info";
  message: string;
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
  React.useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  React.useEffect(() => {
    setPackages(initialPackages);
  }, [initialPackages]);

  React.useEffect(() => {
    setAddons(initialAddons);
  }, [initialAddons]);

  const [activeTab, setActiveTab] = React.useState<TabKey>("services");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

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
  const [togglingIds, setTogglingIds] = React.useState<Record<string, boolean>>({});

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
    }> = [];

    services
      .filter((s) => s.isArchived)
      .forEach((s) =>
        list.push({
          id: s.id,
          name: s.name,
          type: "service",
          durationFormatted: `${s.durationMinutes} min`,
          priceFormatted: s.priceFormatted,
          rawItem: s,
        })
      );

    packages
      .filter((p) => p.isArchived)
      .forEach((p) =>
        list.push({
          id: p.id,
          name: p.name,
          type: "package",
          durationFormatted: `${p.durationMinutes} min`,
          priceFormatted: p.priceFormatted,
          rawItem: p,
        })
      );

    addons
      .filter((a) => a.isArchived)
      .forEach((a) =>
        list.push({
          id: a.id,
          name: a.name,
          type: "add-on",
          durationFormatted: `+${a.durationMinutes} min`,
          priceFormatted: a.priceFormatted,
          rawItem: a,
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
        showToast("success", "Add-on created successfully.");
      }
    }
  };

  // ─── Archive & Delete Confirmations ────────────────────────────────────────

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setIsSubmitting(true);
    const { item, type } = archiveTarget;

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
        showToast("success", `“${item.name}” restored to Add-ons.`);
      } else {
        showToast("error", res.error);
      }
    }
  };

  return (
    <div className="flex min-h-dvh bg-[#FAF9F5]">
      {/* Merchant Sidebar with Services tab wired */}
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-400 uppercase mb-1">
              <Icon name="layers" className="size-4 text-[#C35000]" />
              <span>SERVICES</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-neutral-900 tracking-tight">
              Services
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Manage your service catalog, packages, add-ons, and pricing.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingPackage(null);
                setPackageModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 transition"
            >
              <Icon name="layers" className="size-4 text-[#C35000]" />
              <span>+ Add Package</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAddon(null);
                setAddonModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 transition"
            >
              <Icon name="check" className="size-4 text-emerald-600" />
              <span>+ Add Add-on</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingService(null);
                setServiceModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C35000] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A94400] transition"
            >
              <span>+ Add Service</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            featured
            label="Active Services"
            value={activeServicesCount}
            caption="Visible to clients on booking"
            icon="layers"
            progress={100}
            onClick={() => setActiveTab("services")}
          />
          <MetricCard
            label="Packages"
            value={totalPackagesCount}
            caption="Bundled service offers"
            icon="layers"
            progress={100}
            onClick={() => setActiveTab("packages")}
          />
          <MetricCard
            label="Add-ons"
            value={totalAddonsCount}
            caption="Optional upgrades & treatments"
            icon="check"
            progress={100}
            onClick={() => setActiveTab("addons")}
          />
          <MetricCard
            label="Inactive / Archived"
            value={inactiveOrArchivedCount}
            caption="Hidden from booking menu"
            icon="alert"
            progress={100}
            onClick={() => setActiveTab("archived")}
          />
        </div>

        {/* Workspace Surface (Tabs, Search, Filter & Tables) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
          {/* Tabs and Search / Filter Header */}
          <div className="border-b border-neutral-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === "services"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Services ({nonArchivedServices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("packages")}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === "packages"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Packages ({nonArchivedPackages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("addons")}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === "addons"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Add-ons ({nonArchivedAddons.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("archived")}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === "archived"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Archived ({archivedItems.length})
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Search input */}
              <div className="relative flex-1 sm:w-64">
                <Icon
                  name="search"
                  className="absolute left-3 top-2.5 size-4 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C35000] focus:ring-2 focus:ring-[#C35000]/20 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter (for non-archived tabs) */}
              {activeTab !== "archived" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-[#C35000] focus:ring-2 focus:ring-[#C35000]/20 focus:outline-none transition"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              )}

              {/* Category Filter (Services tab only) */}
              {activeTab === "services" && categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 focus:border-[#C35000] focus:ring-2 focus:ring-[#C35000]/20 focus:outline-none transition max-w-[140px] truncate"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {/* 1. SERVICES TAB TABLE */}
            {activeTab === "services" && (
              <>
                {filteredServices.length === 0 ? (
                  <EmptyState
                    title={searchQuery ? "No matching services" : "No services yet"}
                    description={
                      searchQuery
                        ? "Try adjusting your search keywords or clear your active filters."
                        : "Start adding services to your catalog so clients can book appointments online."
                    }
                    className="py-16"
                  />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">Service Name</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4">Staff Eligibility</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                      {filteredServices.map((service) => {
                        const isToggling = Boolean(togglingIds[service.id]);
                        return (
                          <tr
                            key={service.id}
                            className="hover:bg-neutral-50/70 transition-colors"
                          >
                            <td className="py-4 px-4 sm:px-6 min-w-[180px]">
                              <div className="font-semibold text-neutral-900">
                                {service.name}
                              </div>
                              {service.description && (
                                <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                  {service.description}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {service.categoryName ? (
                                <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                                  {service.categoryName}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-medium text-neutral-700">
                              {service.durationMinutes} min
                              {service.bufferMinutes > 0 && (
                                <span className="text-[10px] text-neutral-400 block">
                                  +{service.bufferMinutes}m buffer
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-semibold text-neutral-900">
                              {service.priceFormatted}
                            </td>
                            <td className="py-4 px-4 min-w-[140px]">
                              {service.assignedStaff.length === 0 ? (
                                <span className="text-neutral-400">None assigned</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {service.assignedStaff.slice(0, 3).map((st) => (
                                      <div
                                        key={st.id}
                                        title={st.fullName}
                                        className="flex size-6 items-center justify-center rounded-full bg-[#C35000]/15 text-[9px] font-bold text-[#C35000] ring-2 ring-white"
                                      >
                                        {st.fullName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-[11px] font-medium text-neutral-600">
                                    {service.assignedStaff.length}{" "}
                                    {service.assignedStaff.length === 1 ? "staff" : "staff"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={service.active}
                                disabled={isToggling}
                                onClick={() => handleToggleService(service)}
                                title={service.active ? "Click to deactivate" : "Click to activate"}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  service.active ? "bg-[#C35000]" : "bg-neutral-200"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    service.active ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingService(service);
                                    setServiceModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
                                  title="Edit service"
                                >
                                  <span className="text-xs font-semibold text-[#C35000]">
                                    Edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setArchiveTarget({ item: service, type: "service" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-amber-50 hover:text-amber-700 transition"
                                  title="Archive service"
                                >
                                  <span className="text-xs font-medium text-amber-700">
                                    Archive
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({ item: service, type: "service" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition"
                                  title="Delete service"
                                >
                                  <Icon name="trash" className="size-4 text-neutral-400 hover:text-red-600" />
                                </button>
                              </div>
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
                  <EmptyState
                    title={searchQuery ? "No matching packages" : "No packages created"}
                    description={
                      searchQuery
                        ? "Try adjusting your search keywords."
                        : "Bundle complementary services together at a bundle price to boost sales."
                    }
                    className="py-16"
                  />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">Package Name</th>
                        <th className="py-3.5 px-4">Bundled Services</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                      {filteredPackages.map((pkg) => {
                        const isToggling = Boolean(togglingIds[pkg.id]);
                        return (
                          <tr key={pkg.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-4 px-4 sm:px-6 min-w-[180px]">
                              <div className="font-semibold text-neutral-900">{pkg.name}</div>
                              {pkg.description && (
                                <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                  {pkg.description}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 min-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {pkg.bundledServices.map((bs) => (
                                  <span
                                    key={bs.id}
                                    className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                                  >
                                    {bs.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-medium text-neutral-700">
                              {pkg.durationMinutes} min
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-semibold text-neutral-900">
                              {pkg.priceFormatted}
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={pkg.active}
                                disabled={isToggling}
                                onClick={() => handleTogglePackage(pkg)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  pkg.active ? "bg-[#C35000]" : "bg-neutral-200"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    pkg.active ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPackage(pkg);
                                    setPackageModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 transition"
                                >
                                  <span className="text-xs font-semibold text-[#C35000]">
                                    Edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setArchiveTarget({ item: pkg, type: "package" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-amber-50 hover:text-amber-700 transition"
                                >
                                  <span className="text-xs font-medium text-amber-700">
                                    Archive
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({ item: pkg, type: "package" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition"
                                >
                                  <Icon name="trash" className="size-4 text-neutral-400 hover:text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* 3. ADD-ONS TAB TABLE */}
            {activeTab === "addons" && (
              <>
                {filteredAddons.length === 0 ? (
                  <EmptyState
                    title={searchQuery ? "No matching add-ons" : "No add-ons created"}
                    description={
                      searchQuery
                        ? "Try adjusting your search query."
                        : "Create optional add-ons (scalp massage, conditioning, nail art) that customers can attach to bookings."
                    }
                    className="py-16"
                  />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">Add-on Name</th>
                        <th className="py-3.5 px-4">Applicability</th>
                        <th className="py-3.5 px-4">Extra Duration</th>
                        <th className="py-3.5 px-4">Extra Price</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                      {filteredAddons.map((addon) => {
                        const isToggling = Boolean(togglingIds[addon.id]);
                        return (
                          <tr
                            key={addon.id}
                            className="hover:bg-neutral-50/70 transition-colors"
                          >
                            <td className="py-4 px-4 sm:px-6 min-w-[180px]">
                              <div className="font-semibold text-neutral-900">{addon.name}</div>
                              {addon.description && (
                                <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                  {addon.description}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {addon.linkedServiceIds.length === 0 ? (
                                <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                  All services
                                </span>
                              ) : (
                                <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                                  {addon.linkedServiceIds.length} specific services
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-medium text-neutral-700">
                              +{addon.durationMinutes} min
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-semibold text-neutral-900">
                              +{addon.priceFormatted}
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={addon.active}
                                disabled={isToggling}
                                onClick={() => handleToggleAddon(addon)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  addon.active ? "bg-[#C35000]" : "bg-neutral-200"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    addon.active ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAddon(addon);
                                    setAddonModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 transition"
                                >
                                  <span className="text-xs font-semibold text-[#C35000]">
                                    Edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setArchiveTarget({ item: addon, type: "add-on" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-amber-50 hover:text-amber-700 transition"
                                >
                                  <span className="text-xs font-medium text-amber-700">
                                    Archive
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({ item: addon, type: "add-on" })
                                  }
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition"
                                >
                                  <Icon name="trash" className="size-4 text-neutral-400 hover:text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* 4. ARCHIVED TAB TABLE */}
            {activeTab === "archived" && (
              <>
                {filteredArchived.length === 0 ? (
                  <EmptyState
                    title="No archived items"
                    description="When you archive services, packages, or add-ons, they will appear here so you can restore them anytime."
                    className="py-16"
                  />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">Item Name</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                      {filteredArchived.map((archived) => (
                        <tr key={archived.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-4 px-4 sm:px-6 font-semibold text-neutral-900">
                            {archived.name}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                              {archived.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap font-medium text-neutral-600">
                            {archived.durationFormatted}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap font-semibold text-neutral-800">
                            {archived.priceFormatted}
                          </td>
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRestoreArchived(archived.rawItem, archived.type)
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-[#C35000] hover:bg-[#C35000]/10 rounded-lg transition"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    item: archived.rawItem,
                                    type: archived.type,
                                  })
                                }
                                className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>

          {/* Footer Helper Note */}
          <div className="border-t border-neutral-200/80 bg-neutral-50/50 px-5 py-3.5 flex items-center gap-2.5 text-xs text-neutral-500">
            <Icon name="alert" className="size-4 text-[#C35000] shrink-0" />
            <span>
              <strong className="font-semibold text-neutral-700">Need help?</strong> Changes
              made here reflect immediately on your public booking page.
            </span>
          </div>
        </div>
      </main>

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

      {/* Archive Confirmation Modal */}
      <ArchiveModal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        title={archiveTarget?.item.name || ""}
        itemType={archiveTarget?.type}
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
          setArchiveTarget({ item: srv, type: "service" });
        }}
        title={blockedDeleteError?.service.name || ""}
        errorMessage={blockedDeleteError?.message}
        isLoading={isSubmitting}
      />

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
                t.type === "error"
                  ? "bg-red-950/90 border-red-800 text-red-100"
                  : t.type === "success"
                  ? "bg-neutral-900/90 border-neutral-700 text-white"
                  : "bg-neutral-900/90 border-neutral-700 text-neutral-100"
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
