import { notFound, redirect } from "next/navigation";
import { StaffProfileActions } from "@/components/merchant/staff/staff-profile-actions";
import { StaffSchedulePreview } from "@/components/merchant/staff/staff-schedule-preview";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { PageContent, StatusPill, Surface } from "@/components/admin/primitives";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StaffAvatar } from "@/components/merchant/staff/staff-avatar";
import { colorLuminance, normalizeBrandColor } from "@/lib/brand-colors";
import { getStaffProfile, staffDateKey } from "@/lib/merchant/staff-profile";

export const metadata = { title: "Staff Profile" };


export default async function StaffProfilePage({ params }: { params: Promise<{ slug: string; staffId: string }> }) {
  const { slug, staffId } = await params;
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staffId)) notFound();

  const basePath = `/${slug}`;
  const rosterPath = `${basePath}/dashboard/staff`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`${rosterPath}/${staffId}`)}`);

  const { data: tenant } = await supabase.from("tenants").select("id, name, timezone, accent_color").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") notFound();

  const [profile, { data: viewer }] = await Promise.all([
    getStaffProfile(tenant.id, staffId, tenant.timezone, user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!profile) notFound();
  const { managedStaff, services, workWeek, commissionRule, timezone } = profile;
  const fidesOrange = "#c35000";
  const accent = normalizeBrandColor(tenant.accent_color, fidesOrange);
  const accentLuminance = colorLuminance(accent);
  const profileAccent = accentLuminance >= 0.06 && 1.05 / (accentLuminance + 0.05) >= 4.5
    ? accent : fidesOrange;
  const dateLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric" });
  const weekday = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", weekday: "short" });
  const time = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const firstDay = new Date(`${workWeek[0].date}T00:00:00Z`);
  const lastDay = new Date(`${workWeek[6].date}T00:00:00Z`);
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
        userRole={membership.role}
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
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-4 sm:p-6"
              style={{ backgroundColor: `color-mix(in srgb, ${profileAccent} 16%, white)` }}>
              <div className="flex min-w-0 items-center gap-4">
                <StaffAvatar name={managedStaff.fullName} imageUrl={managedStaff.imageUrl} size={56}
                  colors={{ background: profileAccent, foreground: "#ffffff" }} />
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

          <Surface className="space-y-5 border border-hairline">
            <h2 className="text-lg font-semibold">Staff details</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <dl className="space-y-4 rounded-lg bg-mist p-4">
                <div>
                  <dt className="text-sm font-semibold">Public title</dt>
                  <dd className="mt-1 break-words text-sm text-body">{managedStaff.title || "No public title added."}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold">Bio</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-body">{managedStaff.bio || "No bio added."}</dd>
                </div>
              </dl>
              <div className="space-y-3 rounded-lg border border-hairline p-4">
                <h3 className="text-sm font-semibold">Assigned services</h3>
                {services.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <li key={service.id} className="break-words rounded-full bg-burnt/10 px-3 py-1 text-sm text-burnt-dark">{service.name}</li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted">No services assigned to this staff member.</p>}
              </div>
            </div>
          </Surface>

          <Surface className="space-y-4 border border-hairline">
            <div id="staff-working-hours" className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Working hours &amp; breaks</h2>
                <p className="mt-1 text-xs text-muted">{dateLabel.formatRange(firstDay, lastDay)} · {timezone}</p>
              </div>
              <StaffSchedulePreview tenantId={tenant.id} staffId={staffId} name={managedStaff.fullName}
                role={managedStaff.roleLabel} timezone={timezone} today={staffDateKey(new Date(), timezone)} />
            </div>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] gap-2" aria-label="Weekly working hours">
              {workWeek.map(({ date, dayEnd, onLeave, blocks }) => (
                <li key={date} className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-xs font-semibold text-ink"><time dateTime={date}>{weekday.format(new Date(`${date}T00:00:00Z`))}</time></h3>
                  <div className="min-h-20 flex-1 space-y-1 rounded-lg bg-mist p-2">
                    {onLeave || blocks.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-muted">{onLeave ? "On leave" : "Day off"}</p>
                    ) : blocks.map((block, index) => (
                      <div key={`${block.start}-${index}`} className={`rounded-md px-1.5 py-1.5 ${block.type === "break" ? "bg-white" : ""}`}>
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums">{time.format(block.start)}–{block.end === dayEnd ? "24:00" : time.format(block.end)}</p>
                        <p className="mt-0.5 text-xs text-muted">{block.type === "break" ? "Break · Unavailable" : "Working hours"}</p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Assigned appointments are shown in the appointment calendar.</p>
          </Surface>
        </PageContent>
      </div>
    </div>
  );
}
