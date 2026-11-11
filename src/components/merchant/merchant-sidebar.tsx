"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MerchantSidebarProps {
  businessName?: string;
  userEmail?: string;
  basePath?: string;
}

export function MerchantSidebar({
  businessName = "Bella Vita",
  userEmail = "Maria Santos",
  basePath = "",
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Active route matching
  const dashboardPath = `${basePath}/dashboard`;
  const isOverview = pathname === dashboardPath || pathname === `${dashboardPath}/overview`;
  const isAppointments = pathname.startsWith(`${dashboardPath}/appointments`);
  const isWebsiteSettings = pathname.startsWith(`${dashboardPath}/settings/website`);

  return (
    <>
      {/* Mobile Header Bar with Hamburger */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#EDECE8] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100"
            aria-label="Toggle navigation menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-serif text-lg font-bold text-[#C35000]">
            {businessName}
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
          Merchant
        </span>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 z-50 md:z-10 w-64 bg-white border-r border-[#EDECE8] flex flex-col justify-between shrink-0 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#C35000] font-serif">
                {businessName}
              </h1>
              <p className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 mt-0.5">
                Merchant Workspace
              </p>
            </div>
            {mobileOpen && (
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1 text-neutral-400 hover:text-neutral-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Section: MANAGE */}
          <div className="mb-6">
            <span className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2">
              Manage
            </span>
            <nav className="space-y-1 text-xs font-medium">
              <Link
                href={dashboardPath}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isOverview
                    ? "bg-[#FDF3EB] text-[#C35000] font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Overview</span>
              </Link>

              <Link
                href={`${dashboardPath}/appointments`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isAppointments
                    ? "bg-[#FDF3EB] text-[#C35000] font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Appointments</span>
              </Link>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <span>Walk-ins</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
                <span>QR check-in</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Customers</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>Services</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Staff & permissions</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Availability</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Payments</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>Reports</span>
              </div>
            </nav>
          </div>

          {/* Section: CONFIGURATION */}
          <div>
            <span className="block text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-2">
              Configuration
            </span>
            <nav className="space-y-1 text-xs font-medium">
              <Link
                href={`${dashboardPath}/settings/website`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isWebsiteSettings
                    ? "bg-[#FDF3EB] text-[#C35000] font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span>Website settings</span>
              </Link>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Booking settings</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-400 select-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Subscription</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Footer Profile */}
        <div className="p-4 border-t border-[#EDECE8] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C35000] text-white flex items-center justify-center text-xs font-semibold">
              MS
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-neutral-900 truncate">
                {userEmail}
              </span>
              <span className="block text-[11px] text-neutral-400">
                Business owner
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
