import { notFound, redirect } from "next/navigation";
import { StaffProfileActions } from "@/components/merchant/staff/staff-profile-actions";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { PageContent, StatusPill, Surface } from "@/components/admin/primitives";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { getStaffProfile, staffRoleLabels } from "@/lib/merchant/staff-profile";

export const metadata = { title: "Staff Profile" };


export default async function StaffProfilePage({ params }: { params: Promise<{ slug: string; staffId: string }> }) {
  const { slug, staffId } = await params;
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staffId)) notFound();

  const basePath = `/${slug}`;
  const rosterPath = `${basePath}/dashboard/staff`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`${rosterPath}/${staffId}`)}`);

  const { data: tenant } = await supabase.from("tenants").select("id, name, timezone").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") notFound();

  const [profile, { data: viewer }] = await Promise.all([
    getStaffProfile(tenant.id, staffId, tenant.timezone, user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!profile) notFound();
  const { managedStaff, services, shiftsThisWeek, commissionRule, timezone, formatRange } = profile;
  const initials = managedStaff.fullName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const contact = [
    ["Email address", managedStaff.email || "Not provided"],
    ["Phone number", managedStaff.phone || "Not provided"],
    ["Dashboard role", managedStaff.roleLabel],
    ["Commission rule", commissionRule],
    ["Accrued this month", managedStaff.commissionValue > 0 ? managedStaff.earnings : "Not applicable"],
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar
        businessName={tenant.name}
        userName={viewer?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
        userEmail={user.email ?? "Merchant staff"}
        userRole={membership.role === "owner" ? "Business owner" : staffRoleLabels[membership.role]}
        basePath={basePath}
      />
      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          <header>
            <Link href={rosterPath} className="inline-flex items-center gap-2 text-sm font-semibold text-burnt hover:underline">
              <span aria-hidden="true">←</span> Back to Staff
            </Link>
            <h1 className="mt-3 font-display text-[28px] leading-tight sm:text-[32px]">Staff Profile</h1>
            <p className="mt-1 text-sm text-muted">View staff information, service eligibility, and working hours.</p>
          </header>

          <Surface className="overflow-hidden border border-hairline !p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-burnt/5 p-4 sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                {managedStaff.imageUrl ? (
                  <Image src={managedStaff.imageUrl} width={56} height={56} alt="" unoptimized className="size-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-burnt/10 text-lg font-semibold text-burnt-dark">{initials}</span>
                )}
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-semibold">{managedStaff.fullName}</h2>
                  <div className="mt-1.5">
                    <StatusPill tone={managedStaff.active ? "success" : "neutral"}>{managedStaff.active ? "Active" : "Inactive"}</StatusPill>
                  </div>
                </div>
              </div>
              <StaffProfileActions tenantId={tenant.id} basePath={basePath} staff={managedStaff} lastOwnerProtected={profile.lastOwnerProtected} />
            </div>
            <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-5">
              {contact.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>

          <Surface className="space-y-4 border border-hairline">
            <h2 className="text-lg font-semibold">Staff details</h2>
            {(managedStaff.title || managedStaff.bio) && (
              <div className="space-y-1">
                {managedStaff.title && <p className="text-sm font-medium">{managedStaff.title}</p>}
                {managedStaff.bio && <p className="whitespace-pre-wrap break-words text-sm text-muted">{managedStaff.bio}</p>}
              </div>
            )}
            <div className="space-y-2 border-t border-hairline pt-4">
              <h3 className="text-sm font-semibold">Services this person can perform</h3>
              {services.length ? (
                <ul className="flex flex-wrap gap-2">
                  {services.map((service) => (
                    <li key={service.id} className="break-words rounded-full bg-burnt/10 px-3 py-1 text-sm text-burnt-dark">{service.name}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No service assignments.</p>}
            </div>
          </Surface>

          <Surface className="space-y-4 border border-hairline">
            <div id="staff-working-hours">
              <h2 className="text-lg font-semibold">Working hours &amp; breaks</h2>
              <p className="mt-1 text-xs text-muted">Next 7 days · {timezone}</p>
            </div>
            {shiftsThisWeek.length ? (
              <ul className="divide-y divide-hairline rounded-lg bg-mist px-4">
                {shiftsThisWeek.map((shift) => (
                  <li key={shift.id} className="py-3 text-sm">
                    <p className="font-medium">{formatRange(shift.starts_at, shift.ends_at)}</p>
                    {shift.breaks.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at)).map((pause) => (
                      <p key={pause.id} className="mt-1 text-xs text-muted">Break · {formatRange(pause.starts_at, pause.ends_at)}</p>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-1 rounded-lg bg-mist p-5 text-sm">
                <p className="font-medium">No working hours assigned</p>
                <p className="text-muted">There are no scheduled shifts in the next 7 days.</p>
              </div>
            )}
          </Surface>
        </PageContent>
      </div>
    </div>
  );
}
