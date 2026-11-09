"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  role: string;
  tenant_id: string | null;
  full_name: string | null;
}

interface Membership {
  tenant_id: string;
  role: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  brand_color: string | null;
  accent_color: string | null;
}

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  memberships: Membership[];
  tenantDetails: TenantDetail[];
  primaryTenant: TenantDetail | null;
}

export function DashboardClient({
  user,
  profile,
  memberships,
  tenantDetails,
  primaryTenant,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "staff" | "customers" | "reports" | "settings">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const brandColor = primaryTenant?.brand_color || "#e85d04";
  const accentColor = primaryTenant?.accent_color || "#f97316";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-200">
            <Link href="/tenant-dashboard" className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-display text-xl font-bold text-burnt">Fides</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {[
              { id: "overview", label: "Overview", icon: HomeIcon },
              { id: "appointments", label: "Appointments", icon: CalendarIcon },
              { id: "staff", label: "Staff", icon: UsersIcon },
              { id: "customers", label: "Customers", icon: UserGroupIcon },
              { id: "reports", label: "Reports", icon: ChartBarIcon },
              { id: "settings", label: "Settings", icon: CogIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === item.id
                    ? "bg-burnt/10 text-burnt"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                {item.label}
              </button>
            ))}

            {tenantDetails.length > 1 && (
              <>
                <div className="pt-4 mt-4 border-t border-neutral-200">
                  <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Your Businesses
                  </p>
                  {tenantDetails.map((tenant) => (
                    <button
                      key={tenant.id}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200",
                        primaryTenant?.id === tenant.id
                          ? "bg-burnt/10 text-burnt"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                    >
                      <span className="truncate font-medium">{tenant.name}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ml-2",
                          tenant.status === "active"
                            ? "bg-green-100 text-green-800"
                            : tenant.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-neutral-100 text-neutral-700"
                        )}
                      >
                        {tenant.status}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* User profile & logout */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center gap-3 px-2 py-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: brandColor }}
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-neutral-500 capitalize">{profile?.role || "staff"}</p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold text-neutral-900">
                {primaryTenant ? primaryTenant.name : "Fides Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-semibold",
                  primaryTenant?.status === "active"
                    ? "bg-green-100 text-green-800"
                    : primaryTenant?.status === "suspended"
                    ? "bg-red-100 text-red-800"
                    : "bg-neutral-100 text-neutral-700"
                )}
              >
                {primaryTenant?.status || "No tenant"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === "overview" && (
            <OverviewTab
              user={user}
              profile={profile}
              primaryTenant={primaryTenant}
              tenantDetails={tenantDetails}
              brandColor={brandColor}
              accentColor={accentColor}
            />
          )}
          {activeTab === "appointments" && (
            <AppointmentsTab brandColor={brandColor} />
          )}
          {activeTab === "staff" && (
            <StaffTab brandColor={brandColor} />
          )}
          {activeTab === "customers" && (
            <CustomersTab brandColor={brandColor} />
          )}
          {activeTab === "reports" && (
            <ReportsTab brandColor={brandColor} />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              primaryTenant={primaryTenant}
              tenantDetails={tenantDetails}
              brandColor={brandColor}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17a1 1 0 01-1 1H6a1 1 0 01-1-1v-2.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 2.257a1 1 0 01-.51-.05l-3.983-1.261a1 1 0 01-.425-.574L1.234 2.072A1 1 0 011.832 1H5a2 2 0 012 2v3.28c0 .548.452 1 1 1H9a1 1 0 001-1V7a1 1 0 012 0v3.28c0 .548.452 1 1 1h4.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 01.502-1.21l2.257-2.257a1 1 0 01.51.05l3.983 1.261a1 1 0 01.425.574l1.805 5.416a1 1 0 01-.405 1.396l-2.257 2.257a1 1 0 01-1.21.502L16.28 15.5a1 1 0 01-1.21-.502l-1.498-4.493a1 1 0 00-.684-.948H17a2 2 0 01-2-2V7a2 2 0 012-2h3.28c.548 0 1 .452 1 1v4.28a1 1 0 001 1H21a2 2 0 012 2v4.28c0 .548-.452 1-1 1H17a1 1 0 01-1 1v3.28a2 2 0 01-2 2H7a2 2 0 01-2-2v-3.28a1 1 0 00-1-1H3a2 2 0 01-2-2V5z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Tab Components
function OverviewTab({
  user,
  profile,
  primaryTenant,
  tenantDetails,
  brandColor,
  accentColor,
}: {
  user: User;
  profile: Profile | null;
  primaryTenant: TenantDetail | null;
  tenantDetails: TenantDetail[];
  brandColor: string;
  accentColor: string;
}) {
  const stats = [
    { label: "Total Appointments", value: "142", change: "+12%", trend: "up" },
    { label: "This Month Revenue", value: "₱284,500", change: "+8%", trend: "up" },
    { label: "Active Customers", value: "89", change: "+5", trend: "up" },
    { label: "Staff Utilization", value: "78%", change: "-2%", trend: "down" },
  ];

  const recentAppointments = [
    { id: "1", customer: "Maria Santos", service: "Root Canal", staff: "Dr. Elena", time: "10:00 AM", status: "confirmed" },
    { id: "2", customer: "Juan Dela Cruz", service: "Teeth Cleaning", staff: "Dr. Miguel", time: "11:30 AM", status: "pending" },
    { id: "3", customer: "Ana Reyes", service: "Consultation", staff: "Dr. Elena", time: "2:00 PM", status: "confirmed" },
    { id: "4", customer: "Pedro Garcia", service: "Filling", staff: "Dr. Marco", time: "3:30 PM", status: "completed" },
    { id: "5", customer: "Lisa Chen", service: "Whitening", staff: "Dr. Miguel", time: "4:00 PM", status: "cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!
          </h2>
          <p className="text-neutral-600 mt-1">
            Here's what's happening at {primaryTenant?.name || "your business"} today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <PlusIcon className="w-4 h-4" />
            New Appointment
          </Button>
          <Button style={{ backgroundColor: brandColor }} className="gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-neutral-200 p-6"
            style={{ borderTop: `4px solid ${stat.trend === "up" ? "#10b981" : "#ef4444"}` }}
          >
            <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">{stat.value}</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={cn("text-sm font-semibold", stat.trend === "up" ? "text-green-600" : "text-red-600")}>
                {stat.change}
              </span>
              <span className="text-sm text-neutral-500">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions & Recent appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: "Book Appointment", icon: CalendarIcon, color: brandColor },
                { label: "Add Customer", icon: UserPlusIcon, color: "#10b981" },
                { label: "View Schedule", icon: ClockIcon, color: "#3b82f6" },
                { label: "Send Reminders", icon: BellIcon, color: "#f59e0b" },
                { label: "Generate Report", icon: ChartBarIcon, color: "#8b5cf6" },
                { label: "Manage Staff", icon: UsersIcon, color: "#ec4899" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-neutral-50 transition"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: action.color }}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-neutral-900">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Business Info */}
          {primaryTenant && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Business Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Subdomain</dt>
                  <dd className="font-medium text-neutral-900 font-mono">{primaryTenant.slug}.fides.app</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Status</dt>
                  <dd>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        primaryTenant.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      )}
                    >
                      {primaryTenant.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Your Role</dt>
                  <dd className="font-medium text-neutral-900 capitalize">{profile?.role || "staff"}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Today's Appointments</h3>
              <Link href="/tenant-dashboard?tab=appointments" className="text-sm font-medium text-burnt hover:text-burnt-dark flex items-center gap-1">
                View all
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-neutral-200">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${brandColor}15` }}
                    >
                      <UserGroupIcon className="w-6 h-6" style={{ color: brandColor }} />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{apt.customer}</p>
                      <p className="text-sm text-neutral-500">{apt.service} • {apt.staff}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>{apt.time}</span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        apt.status === "confirmed" && "bg-green-100 text-green-800",
                        apt.status === "pending" && "bg-yellow-100 text-yellow-800",
                        apt.status === "completed" && "bg-blue-100 text-blue-800",
                        apt.status === "cancelled" && "bg-red-100 text-red-800"
                      )}
                    >
                      {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentsTab({ brandColor }: { brandColor: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Appointments</h2>
          <p className="text-neutral-600 mt-1">Manage and view all appointments</p>
        </div>
        <Button style={{ backgroundColor: brandColor }} className="gap-2">
          <PlusIcon className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                className="pl-10 pr-4 py-2 w-64 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-burnt/20 focus:border-burnt outline-none"
              />
            </div>
            <select className="px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-burnt/20 focus:border-burnt outline-none">
              <option>All Status</option>
              <option>Confirmed</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <select className="px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-burnt/20 focus:border-burnt outline-none">
              <option>All Time</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FilterIcon className="w-4 h-4" />
              Filters
            </Button>
            <Button variant="outline" className="gap-2">
              <DownloadIcon className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                {["Time", "Customer", "Service", "Staff", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {[
                { time: "9:00 AM", customer: "Maria Santos", service: "Root Canal", staff: "Dr. Elena Rostova", status: "confirmed" },
                { time: "10:30 AM", customer: "Juan Dela Cruz", service: "Teeth Cleaning", staff: "Dr. Miguel Lim", status: "pending" },
                { time: "11:00 AM", customer: "Ana Reyes", service: "Consultation", staff: "Dr. Elena Rostova", status: "confirmed" },
                { time: "1:00 PM", customer: "Pedro Garcia", service: "Filling", staff: "Dr. Marco Santos", status: "completed" },
                { time: "2:30 PM", customer: "Lisa Chen", service: "Whitening", staff: "Dr. Miguel Lim", status: "cancelled" },
                { time: "3:00 PM", customer: "Roberto Cruz", service: "Extraction", staff: "Dr. Elena Rostova", status: "confirmed" },
                { time: "4:30 PM", customer: "Sofia Martinez", service: "Check-up", staff: "Dr. Marco Santos", status: "pending" },
              ].map((apt, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{apt.time}</td>
                  <td className="px-6 py-4 text-sm text-neutral-900">{apt.customer}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{apt.service}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{apt.staff}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        apt.status === "confirmed" && "bg-green-100 text-green-800",
                        apt.status === "pending" && "bg-yellow-100 text-yellow-800",
                        apt.status === "completed" && "bg-blue-100 text-blue-800",
                        apt.status === "cancelled" && "bg-red-100 text-red-800"
                      )}
                    >
                      {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="View">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-sm text-neutral-500">Showing 1 to 7 of 24 appointments</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="w-10">1</Button>
            <Button variant="outline" size="sm" className="w-10">2</Button>
            <Button variant="outline" size="sm" className="w-10">3</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffTab({ brandColor }: { brandColor: string }) {
  const staff = [
    { id: "1", name: "Dr. Elena Rostova", role: "Owner / Dentist", email: "elena@apexdental.ph", phone: "+63 917 123 4567", status: "active", avatar: "ER" },
    { id: "2", name: "Dr. Miguel Lim", role: "Associate Dentist", email: "miguel@apexdental.ph", phone: "+63 918 234 5678", status: "active", avatar: "ML" },
    { id: "3", name: "Sofia Cruz", role: "Lead Receptionist", email: "sofia@apexdental.ph", phone: "+63 919 345 6789", status: "active", avatar: "SC" },
    { id: "4", name: "Carlos Mendoza", role: "Dental Assistant", email: "carlos@apexdental.ph", phone: "+63 920 456 7890", status: "active", avatar: "CM" },
    { id: "5", name: "Anna Reyes", role: "Hygienist", email: "anna@apexdental.ph", phone: "+63 921 567 8901", status: "inactive", avatar: "AR" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Staff Management</h2>
          <p className="text-neutral-600 mt-1">Manage your team members and their roles</p>
        </div>
        <Button style={{ backgroundColor: brandColor }} className="gap-2">
          <UserPlusIcon className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                {["Staff Member", "Role", "Contact", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: brandColor }}
                      >
                        {member.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{member.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-burnt/10 text-burnt">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    <div>{member.email}</div>
                    <div>{member.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        member.status === "active" ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-700"
                      )}
                    >
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="View">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition" aria-label="Remove">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomersTab({ brandColor }: { brandColor: string }) {
  const customers = [
    { id: "1", name: "Maria Santos", email: "maria@email.com", phone: "+63 917 111 2222", visits: 12, lastVisit: "2026-10-15", totalSpent: "₱45,200", status: "active" },
    { id: "2", name: "Juan Dela Cruz", email: "juan@email.com", phone: "+63 918 222 3333", visits: 8, lastVisit: "2026-10-10", totalSpent: "₱28,500", status: "active" },
    { id: "3", name: "Ana Reyes", email: "ana@email.com", phone: "+63 919 333 4444", visits: 5, lastVisit: "2026-09-28", totalSpent: "₱15,800", status: "active" },
    { id: "4", name: "Pedro Garcia", email: "pedro@email.com", phone: "+63 920 444 5555", visits: 3, lastVisit: "2026-09-15", totalSpent: "₱8,900", status: "inactive" },
    { id: "5", name: "Lisa Chen", email: "lisa@email.com", phone: "+63 921 555 6666", visits: 15, lastVisit: "2026-10-05", totalSpent: "₱67,400", status: "active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Customers</h2>
          <p className="text-neutral-600 mt-1">View and manage your customer database</p>
        </div>
        <Button style={{ backgroundColor: brandColor }} className="gap-2">
          <UserPlusIcon className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                {["Customer", "Contact", "Visits", "Last Visit", "Total Spent", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: brandColor }}
                      >
                        {customer.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{customer.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    <div>{customer.email}</div>
                    <div>{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{customer.visits}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{customer.lastVisit}</td>
                  <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{customer.totalSpent}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        customer.status === "active" ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-700"
                      )}
                    >
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="View">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" aria-label="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ brandColor }: { brandColor: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Reports & Analytics</h2>
        <p className="text-neutral-600 mt-1">Track your business performance and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Revenue Overview</h3>
          <div className="h-64 flex items-end justify-around gap-2 px-4">
            {[
              { month: "Jan", value: 65 },
              { month: "Feb", value: 78 },
              { month: "Mar", value: 82 },
              { month: "Apr", value: 91 },
              { month: "May", value: 88 },
              { month: "Jun", value: 95 },
              { month: "Jul", value: 102 },
              { month: "Aug", value: 98 },
              { month: "Sep", value: 110 },
              { month: "Oct", value: 118 },
              { month: "Nov", value: 125 },
              { month: "Dec", value: 132 },
            ].map((item, i) => (
              <div key={item.month} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${item.value}%`,
                    backgroundColor: i >= 9 ? brandColor : `${brandColor}40`,
                  }}
                />
                <span className="text-xs text-neutral-500 mt-2">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Appointments by Type</h3>
          <div className="space-y-4">
            {[
              { label: "General Check-up", value: 45, color: "#3b82f6" },
              { label: "Teeth Cleaning", value: 32, color: "#10b981" },
              { label: "Root Canal", value: 12, color: "#f59e0b" },
              { label: "Filling", value: 8, color: "#ef4444" },
              { label: "Whitening", value: 5, color: "#8b5cf6" },
              { label: "Other", value: 8, color: "#6b7280" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-neutral-700 flex-1">{item.label}</span>
                <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-sm font-semibold text-neutral-900 w-12 text-right">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Export Reports</h3>
          <div className="space-y-3">
            {[
              { label: "Monthly Revenue Report", desc: "Detailed revenue breakdown by service" },
              { label: "Appointment Summary", desc: "All appointments with filters" },
              { label: "Customer Retention", desc: "Repeat customer analysis" },
              { label: "Staff Performance", desc: "Individual staff metrics" },
              { label: "Inventory Usage", desc: "Supplies and materials report" },
            ].map((item, i) => (
              <Button key={i} variant="outline" className="w-full justify-between" style={{ borderColor: "transparent", backgroundColor: "transparent", textAlign: "left", padding: "0" }}>
                <div>
                  <p className="font-medium text-neutral-900">{item.label}</p>
                  <p className="text-xs text-neutral-500">{item.desc}</p>
                </div>
                <DownloadIcon className="w-4 h-4 text-neutral-400" />
              </Button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg. Appointment Value", value: "₱2,840" },
              { label: "Customer Retention Rate", value: "87%" },
              { label: "No-show Rate", value: "3.2%" },
              { label: "Avg. Wait Time", value: "5 min" },
              { label: "Booking Conversion", value: "94%" },
              { label: "Revenue per Staff", value: "₱71,125" },
              { label: "Peak Hours", value: "10AM - 2PM" },
              { label: "Cancellation Rate", value: "4.1%" },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-lg bg-neutral-50">
                <p className="text-sm text-neutral-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({
  primaryTenant,
  tenantDetails,
  brandColor,
}: {
  primaryTenant: TenantDetail | null;
  tenantDetails: TenantDetail[];
  brandColor: string;
}) {
  const [activeSection, setActiveSection] = useState<"business" | "branding" | "notifications" | "integrations" | "team" | "billing">("business");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Settings</h2>
        <p className="text-neutral-600 mt-1">Manage your business configuration and preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Settings sidebar */}
          <div className="lg:w-56 border-r border-neutral-200 p-4">
            <nav className="space-y-1">
              {[
                { id: "business", label: "Business Info", icon: HomeIcon },
                { id: "branding", label: "Branding", icon: ShieldIcon },
                { id: "notifications", label: "Notifications", icon: BellIcon },
                { id: "integrations", label: "Integrations", icon: GlobeIcon },
                { id: "team", label: "Team Access", icon: UsersIcon },
                { id: "billing", label: "Billing", icon: KeyIcon },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as typeof activeSection)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "bg-burnt/10 text-burnt"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  )}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings content */}
          <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {activeSection === "business" && (
              <BusinessSettings primaryTenant={primaryTenant} brandColor={brandColor} />
            )}
            {activeSection === "branding" && (
              <BrandingSettings primaryTenant={primaryTenant} brandColor={brandColor} />
            )}
            {activeSection === "notifications" && (
              <NotificationSettings brandColor={brandColor} />
            )}
            {activeSection === "integrations" && (
              <IntegrationSettings brandColor={brandColor} />
            )}
            {activeSection === "team" && (
              <TeamSettings brandColor={brandColor} />
            )}
            {activeSection === "billing" && (
              <BillingSettings brandColor={brandColor} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessSettings({ primaryTenant, brandColor }: { primaryTenant: TenantDetail | null; brandColor: string }) {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Business Information</h3>
        <p className="text-neutral-500 text-sm mt-1">Update your business details that appear on your booking site and invoices.</p>
      </div>

      <form className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5">Business Name</label>
            <Input defaultValue={primaryTenant?.name || ""} placeholder="Enter business name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5">Subdomain</label>
            <div className="flex items-center gap-2">
              <Input defaultValue={primaryTenant?.slug || ""} placeholder="business-name" disabled />
              <span className="text-neutral-500">.fides.app</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Subdomain cannot be changed after creation.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Business Address</label>
          <Input placeholder="Street, City, Province" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5">Phone Number</label>
            <Input placeholder="+63 2 8XXX XXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5">Email Address</label>
            <Input type="email" placeholder="contact@business.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Timezone</label>
          <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-burnt/20 focus:border-burnt outline-none">
            <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
            <option value="UTC">UTC (GMT+0)</option>
          </select>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <Button style={{ backgroundColor: brandColor }}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}

function BrandingSettings({ primaryTenant, brandColor }: { primaryTenant: TenantDetail | null; brandColor: string }) {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Branding & Appearance</h3>
        <p className="text-neutral-500 text-sm mt-1">Customize how your booking site looks to customers.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Brand Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              defaultValue={brandColor}
              className="w-12 h-12 rounded-lg border border-neutral-300 cursor-pointer"
            />
            <div className="flex-1">
              <Input defaultValue={brandColor} placeholder="#e85d04" />
              <p className="text-xs text-neutral-500 mt-1">Primary color used for buttons, links, and accents.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Accent Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              defaultValue="#f97316"
              className="w-12 h-12 rounded-lg border border-neutral-300 cursor-pointer"
            />
            <div className="flex-1">
              <Input defaultValue="#f97316" placeholder="#f97316" />
              <p className="text-xs text-neutral-500 mt-1">Secondary color for highlights and hover states.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Business Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <label className="cursor-pointer">
                <Input type="file" accept="image/*" className="sr-only" />
                <Button variant="outline">Upload Logo</Button>
              </label>
              <p className="text-xs text-neutral-500 mt-1">Recommended: 200x200px, PNG or SVG, max 2MB</p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h4 className="text-md font-semibold text-neutral-900 mb-4">Preview</h4>
          <div className="rounded-lg border border-neutral-200 p-6 bg-neutral-50">
            <div className="max-w-xs mx-auto text-center">
              <div
                className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: brandColor }}
              >
                {primaryTenant?.name?.charAt(0) || "F"}
              </div>
              <h4 className="font-semibold text-neutral-900">{primaryTenant?.name || "Your Business"}</h4>
              <p className="text-sm text-neutral-500 mt-1">{primaryTenant?.slug || "your-business"}.fides.app</p>
              <Button className="mt-4 w-full" style={{ backgroundColor: brandColor }}>
                Book Appointment
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <Button style={{ backgroundColor: brandColor }}>Save Branding</Button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ brandColor }: { brandColor: string }) {
  const notifications = [
    { title: "New Appointment Bookings", desc: "Get notified when customers book appointments", enabled: true },
    { title: "Appointment Reminders", desc: "Send automatic reminders to customers 24h before", enabled: true },
    { title: "Cancellation Alerts", desc: "Notify staff when appointments are cancelled", enabled: true },
    { title: "Daily Summary", desc: "Receive end-of-day summary via email", enabled: false },
    { title: "Weekly Reports", desc: "Weekly performance report every Monday", enabled: false },
    { title: "Marketing Updates", desc: "Receive Fides platform updates and tips", enabled: true },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Notification Preferences</h3>
        <p className="text-neutral-500 text-sm mt-1">Choose how and when you want to be notified.</p>
      </div>

      <div className="space-y-4">
        {notifications.map((notif, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{notif.title}</p>
              <p className="text-sm text-neutral-500">{notif.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={notif.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-burnt/20 peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burnt"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationSettings({ brandColor }: { brandColor: string }) {
  const integrations = [
    { name: "Google Calendar", desc: "Sync appointments with Google Calendar", connected: false, icon: CalendarIcon },
    { name: "WhatsApp Business", desc: "Send reminders via WhatsApp", connected: false, icon: MailIcon },
    { name: "SMS Gateway", desc: "Send SMS notifications to customers", connected: false, icon: PhoneIcon },
    { name: "Payment Gateway", desc: "Accept online payments", connected: false, icon: KeyIcon },
    { name: "Accounting Software", desc: "Export to QuickBooks/Xero", connected: false, icon: ChartBarIcon },
    { name: "Email Marketing", desc: "Connect with Mailchimp/SendGrid", connected: false, icon: MailIcon },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Integrations</h3>
        <p className="text-neutral-500 text-sm mt-1">Connect Fides with your favorite tools and services.</p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                <integration.icon className="w-6 h-6" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="font-medium text-neutral-900">{integration.name}</p>
                <p className="text-sm text-neutral-500">{integration.desc}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={integration.connected}>
              {integration.connected ? "Connected" : "Connect"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSettings({ brandColor }: { brandColor: string }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Team Access</h3>
        <p className="text-neutral-500 text-sm mt-1">Manage who has access to your Fides dashboard.</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                {["Team Member", "Role", "Permissions", "Last Active", "Actions"].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {[
                { name: "Dr. Elena Rostova", email: "elena@apexdental.ph", role: "Owner", permissions: "Full Access", lastActive: "Today" },
                { name: "Dr. Miguel Lim", email: "miguel@apexdental.ph", role: "Dentist", permissions: "Appointments, Patients", lastActive: "2 hours ago" },
                { name: "Sofia Cruz", email: "sofia@apexdental.ph", role: "Receptionist", permissions: "Appointments, Customers", lastActive: "Today" },
                { name: "Carlos Mendoza", email: "carlos@apexdental.ph", role: "Assistant", permissions: "Appointments", lastActive: "Yesterday" },
              ].map((member, i) => (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: brandColor }}
                      >
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{member.name}</p>
                        <p className="text-sm text-neutral-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-burnt/10 text-burnt">{member.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{member.permissions}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{member.lastActive}</td>
                  <td className="px-6 py-4">
                    <Button variant="outline" size="sm">Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-neutral-200">
          <Button style={{ backgroundColor: brandColor }} className="w-full sm:w-auto gap-2">
            <UserPlusIcon className="w-4 h-4" />
            Invite Team Member
          </Button>
        </div>
      </div>
    </div>
  );
}

function BillingSettings({ brandColor }: { brandColor: string }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Billing & Subscription</h3>
        <p className="text-neutral-500 text-sm mt-1">Manage your Fides subscription and payment details.</p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200 mb-6">
          <div>
            <p className="font-semibold text-green-800">Business Plan</p>
            <p className="text-sm text-green-700">₱29,000/month • Billed monthly</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-neutral-900 mb-3">Payment Method</h4>
            <div className="p-4 rounded-lg border border-neutral-200 flex items-center gap-3">
              <div className="w-10 h-6 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">VC</div>
              <div>
                <p className="font-medium text-neutral-900">Visa ending in 4242</p>
                <p className="text-sm text-neutral-500">Expires 12/2026</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-neutral-900 mb-3">Billing Address</h4>
            <div className="p-4 rounded-lg border border-neutral-200 text-sm text-neutral-600">
              <p>Apex Dental Clinic</p>
              <p>Unit 402, One Ayala Medical Tower</p>
              <p>Makati City, Metro Manila</p>
              <p>Philippines</p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h4 className="font-medium text-neutral-900 mb-4">Invoice History</h4>
          <div className="space-y-3">
            {[
              { date: "Nov 1, 2026", amount: "₱29,000", status: "Paid", invoice: "INV-2026-11-001" },
              { date: "Oct 1, 2026", amount: "₱29,000", status: "Paid", invoice: "INV-2026-10-001" },
              { date: "Sep 1, 2026", amount: "₱29,000", status: "Paid", invoice: "INV-2026-09-001" },
            ].map((inv, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">{inv.invoice}</p>
                  <p className="text-sm text-neutral-500">{inv.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-neutral-900">{inv.amount}</p>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h4 className="font-medium text-neutral-900 mb-4">Subscription Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Starter", price: "₱0", features: ["Up to 5 staff", "1 location", "Basic appointments", "Email support"], current: false },
            { name: "Business", price: "₱29,000/mo", features: ["Up to 25 staff", "3 locations", "Advanced analytics", "Priority support", "Custom domain", "API access"], current: true },
            { name: "Enterprise", price: "₱99,000/mo", features: ["Unlimited staff", "Unlimited locations", "White-label", "Dedicated support", "Custom integrations", "SLA guarantee"], current: false },
          ].map((plan, i) => (
            <div
              key={i}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all",
                plan.current
                  ? "border-burnt bg-burnt/5"
                  : "border-neutral-200 hover:border-neutral-300"
              )}
            >
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-burnt text-white">
                  Current Plan
                </div>
              )}
              <h5 className="font-semibold text-neutral-900">{plan.name}</h5>
              <p className="mt-2 text-3xl font-bold text-neutral-900">{plan.price}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.current ? "outline" : "solid"}
                style={{ backgroundColor: plan.current ? "transparent" : brandColor, borderColor: plan.current ? brandColor : "transparent" }}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}