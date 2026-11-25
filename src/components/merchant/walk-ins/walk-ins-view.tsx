"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading } from "@/components/admin/primitives";
import { createClient } from "@/lib/supabase/client";
import {
  getWalkInWorkspaceAction,
  updateWaitlistStatusAction,
} from "@/app/actions/walk-ins";
import { WalkInModal } from "@/components/merchant/walk-in-modal";
import { AssignSlotModal } from "./assign-slot-modal";
import type {
  WaitlistQueueItem,
  WalkInStaffOption,
  WalkInWorkspaceData,
} from "@/types/walk-ins";

interface WalkInsViewProps {
  initialData: WalkInWorkspaceData;
}

export function WalkInsView({ initialData }: WalkInsViewProps) {
  const [data, setData] = React.useState<WalkInWorkspaceData>(initialData);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "waiting" | "notified"
  >("all");
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [defaultModalStaffId, setDefaultModalStaffId] = React.useState<
    string | undefined
  >(undefined);
  const [assigningEntry, setAssigningEntry] =
    React.useState<WaitlistQueueItem | null>(null);
  const [assignPreselectStaffId, setAssignPreselectStaffId] = React.useState<
    string | undefined
  >(undefined);
  const [openRowMenuId, setOpenRowMenuId] = React.useState<string | null>(null);
  const [openStaffMenuId, setOpenStaffMenuId] = React.useState<string | null>(
    null,
  );
  const [menuPos, setMenuPos] = React.useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const computeMenuPos = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    const openUpward = window.innerHeight - rect.bottom < 180;
    return openUpward
      ? { bottom: window.innerHeight - rect.top + 6, right }
      : { top: rect.bottom + 6, right };
  };

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 3500);
  }, []);

  const refreshData = React.useCallback(async () => {
    const res = await getWalkInWorkspaceAction(data.tenantId);
    if (res.success && res.data) {
      setData(res.data);
    }
  }, [data.tenantId]);

  // Live updates via Supabase Realtime (waitlist_entries + appointments are already published)
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`walkins-workspace-${data.tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waitlist_entries",
          filter: `tenant_id=eq.${data.tenantId}`,
        },
        () => {
          void refreshData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `tenant_id=eq.${data.tenantId}`,
        },
        () => {
          void refreshData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data.tenantId, refreshData]);

  // Close row dropdown menus on outside click, scroll, or resize
  React.useEffect(() => {
    const closeMenus = () => {
      setOpenRowMenuId(null);
      setOpenStaffMenuId(null);
      setMenuPos(null);
    };
    window.addEventListener("click", closeMenus);
    window.addEventListener("scroll", closeMenus, true);
    window.addEventListener("resize", closeMenus);
    return () => {
      window.removeEventListener("click", closeMenus);
      window.removeEventListener("scroll", closeMenus, true);
      window.removeEventListener("resize", closeMenus);
    };
  }, []);

  const filteredQueue = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.waitingList.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.serviceName.toLowerCase().includes(q) ||
        (item.requestedStaffName ?? "any available").toLowerCase().includes(q)
      );
    });
  }, [data.waitingList, search, statusFilter]);

  const handleStatusUpdate = async (
    entry: WaitlistQueueItem,
    status: "notified" | "cancelled" | "expired",
  ) => {
    setOpenRowMenuId(null);
    setMenuPos(null);
    const res = await updateWaitlistStatusAction({
      tenantId: data.tenantId,
      entryId: entry.id,
      status,
    });
    if (res.success) {
      showToast(res.message);
      void refreshData();
    } else {
      showToast(res.error);
    }
  };

  const openQuickWalkInForStaff = (member: WalkInStaffOption) => {
    setOpenStaffMenuId(null);
    setMenuPos(null);
    setDefaultModalStaffId(member.id);
    setWalkInOpen(true);
  };

  const assignFirstWaitingToStaff = (member: WalkInStaffOption) => {
    setOpenStaffMenuId(null);
    setMenuPos(null);
    const eligible =
      data.waitingList.find(
        (w) => !w.requestedStaffId || w.requestedStaffId === member.id,
      ) ?? data.waitingList[0];

    if (!eligible) {
      openQuickWalkInForStaff(member);
      return;
    }
    setAssignPreselectStaffId(member.id);
    setAssigningEntry(eligible);
  };

  const { kpis } = data;

  return (
    <PageContent>
      <PageHeading
        title="Walk-Ins & Waiting List"
        description="Welcome every walk-in. Fill available slots without displacing existing bookings."
        actions={
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => {
              setDefaultModalStaffId("any");
              setWalkInOpen(true);
            }}
            className="shrink-0 shadow-xs"
          >
            + Add walk-in
          </AdminButton>
        }
      />

      <section aria-label="Walk-in metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Waiting now"
          value={kpis.waitingNow}
          caption="First come, first served"
          icon="users"
          progress={100}
          featured
        />
        <MetricCard
          label="Available staff"
          value={kpis.availableStaffCount}
          caption={kpis.availableStaffSummary}
          icon="calendar"
          progress={100}
        />
        <MetricCard
          label="Walk-ins served today"
          value={kpis.walkInsServedToday}
          caption="No scheduled bookings displaced"
          icon="check"
          progress={100}
        />
        <MetricCard
          label="Typical waiting time"
          value={kpis.typicalWaitingMinutes}
          valueSuffix=" min"
          caption="Based on the current queue"
          icon="clock"
          progress={100}
        />
      </section>

      {/* Active Waiting Lists Table */}
      <section className="rounded-xl border border-hairline bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">
              Active Waiting Lists
            </h2>
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#eef1f5] text-xs font-semibold text-ink">
              {filteredQueue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or service"
              className="h-9 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-xs text-ink outline-none focus:border-burnt sm:w-56"
            />
            <select
              aria-label="Filter waiting list"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "waiting" | "notified",
                )
              }
              className="h-9 rounded-lg border border-[#d0d5dd] bg-white px-3 text-xs font-medium text-ink outline-none focus:border-burnt"
            >
              <option value="all">Filter: All</option>
              <option value="waiting">Waiting</option>
              <option value="notified">Notified</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-medium text-muted">
                <th className="py-2.5 pr-4">Time</th>
                <th className="py-2.5 pr-4">Customer</th>
                <th className="py-2.5 pr-4">Service</th>
                <th className="py-2.5 pr-4">Staff</th>
                <th className="py-2.5 pr-4">Est. wait</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/70">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted"
                  >
                    No customers are currently waiting.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-sky/20">
                    <td className="py-3.5 pr-4 text-ink">
                      {item.joinedTimeLabel}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">
                          {item.customerName}
                        </span>
                        {item.status === "notified" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Notified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-ink">{item.serviceName}</td>
                    <td className="py-3.5 pr-4 text-ink">
                      {item.requestedStaffName ?? "Any available"}
                    </td>
                    <td className="py-3.5 pr-4 text-ink">
                      {item.estimatedWaitMinutes} min
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        aria-label={`Actions for ${item.customerName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openRowMenuId === item.id) {
                            setOpenRowMenuId(null);
                            setMenuPos(null);
                            return;
                          }
                          setOpenStaffMenuId(null);
                          setMenuPos(computeMenuPos(e.currentTarget));
                          setOpenRowMenuId(item.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-mist hover:text-ink"
                      >
                        •••
                      </button>

                      {openRowMenuId === item.id && menuPos && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={menuPos}
                          className="fixed z-50 w-48 rounded-lg border border-hairline bg-white py-1 text-left shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              setMenuPos(null);
                              setAssignPreselectStaffId(undefined);
                              setAssigningEntry(item);
                            }}
                            className="block w-full px-3.5 py-2 text-xs font-semibold text-burnt hover:bg-mist"
                          >
                            Assign a slot
                          </button>
                          {item.status === "waiting" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusUpdate(item, "notified")
                              }
                              className="block w-full px-3.5 py-2 text-xs text-ink hover:bg-mist"
                            >
                              Notify customer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(item, "expired")}
                            className="block w-full px-3.5 py-2 text-xs text-muted hover:bg-mist"
                          >
                            Mark as expired
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusUpdate(item, "cancelled")
                            }
                            className="block w-full px-3.5 py-2 text-xs text-danger hover:bg-danger-bg"
                          >
                            Remove from queue
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

        <p className="mt-4 text-xs text-muted">
          A customer is converted to an appointment only when the selected staff
          and resource are available.
        </p>
      </section>

      {/* Available Now Table */}
      <section className="rounded-xl border border-hairline bg-white p-5 shadow-xs">
        <h2 className="text-base font-semibold text-ink">Available Now</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-medium text-muted">
                <th className="py-2.5 pr-4">Staff</th>
                <th className="py-2.5 pr-4">Eligible services</th>
                <th className="py-2.5 pr-4">Resource</th>
                <th className="py-2.5 pr-4">Next availability</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/70">
              {data.availableNow.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted"
                  >
                    All active staff are currently serving clients. New walk-ins
                    can be placed on the waiting list.
                  </td>
                </tr>
              ) : (
                data.availableNow.map((member) => (
                  <tr key={member.id} className="hover:bg-sky/20">
                    <td className="py-3.5 pr-4 font-medium text-ink">
                      {member.fullName}
                    </td>
                    <td className="py-3.5 pr-4 text-ink">
                      {member.eligibleServicesLabel}
                    </td>
                    <td className="py-3.5 pr-4 text-ink">
                      {member.resourceLabel}
                    </td>
                    <td className="py-3.5 pr-4 text-ink">
                      {member.nextAvailableLabel}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        aria-label={`Actions for ${member.fullName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openStaffMenuId === member.id) {
                            setOpenStaffMenuId(null);
                            setMenuPos(null);
                            return;
                          }
                          setOpenRowMenuId(null);
                          setMenuPos(computeMenuPos(e.currentTarget));
                          setOpenStaffMenuId(member.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-mist hover:text-ink"
                      >
                        •••
                      </button>

                      {openStaffMenuId === member.id && menuPos && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={menuPos}
                          className="fixed z-50 w-52 rounded-lg border border-hairline bg-white py-1 text-left shadow-lg"
                        >
                          {data.waitingList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => assignFirstWaitingToStaff(member)}
                              className="block w-full px-3.5 py-2 text-xs font-semibold text-burnt hover:bg-mist"
                            >
                              Assign next waiting guest
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openQuickWalkInForStaff(member)}
                            className="block w-full px-3.5 py-2 text-xs text-ink hover:bg-mist"
                          >
                            Book walk-in with {member.fullName}
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
      </section>

      {/* Modals */}
      <WalkInModal
        isOpen={walkInOpen}
        tenantId={data.tenantId}
        services={data.services}
        staff={data.staff}
        defaultStaffId={defaultModalStaffId}
        onClose={() => setWalkInOpen(false)}
        onCreated={() => void refreshData()}
        onWaitlistAdded={() => void refreshData()}
        showToast={showToast}
      />

      <AssignSlotModal
        entry={assigningEntry}
        allWaiting={data.waitingList}
        staff={data.staff}
        tenantId={data.tenantId}
        preselectedStaffId={assignPreselectStaffId}
        onClose={() => setAssigningEntry(null)}
        onConverted={() => void refreshData()}
        showToast={showToast}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </PageContent>
  );
}
