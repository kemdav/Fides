import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FoxCtaMascot } from "@/components/landing/fox-cta-mascot";
import { tenantColorStyle } from "@/lib/brand-colors";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { staffRoleLabels } from "@/lib/merchant/staff-profile";
import { getStaffInvitation } from "@/lib/merchant/staff-invitations";
import { StaffAccessForm } from "./staff-access-form";

export const metadata: Metadata = {
  title: "Staff access",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function formatInvitationExpiration(value: string, timezone: string | null) {
  const date = new Date(value);
  const timeZone = timezone?.trim().split(/\s+/, 1)[0] || "Asia/Manila";
  try {
    return new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(date);
  }
}

export default async function StaffAccessPage({ searchParams }: {
  searchParams: Promise<{ invite?: string | string[]; workspace?: string | string[]; verifyEmail?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.invite === "string" ? params.invite : "";
  const workspace = typeof params.workspace === "string" ? params.workspace : "";
  const verifyEmail = !token && typeof params.verifyEmail === "string" && /^[A-Za-z0-9_-]{43}$/.test(params.verifyEmail)
    ? params.verifyEmail : undefined;
  if (verifyEmail) redirect(`/staff-email-change?token=${verifyEmail}`);
  const invitation = token ? await getStaffInvitation(token).catch(() => null) : null;
  const invalidInvitation = params.invite !== undefined && !invitation;

  if (invalidInvitation) {
    return (
      <main className="grid min-h-dvh place-items-center bg-powder px-4 py-8 text-ink">
        <section className="w-full max-w-md space-y-3 rounded-2xl border border-line bg-white p-6 text-center shadow-lg">
          <div data-reveal="bounce" data-shown="true" className="mx-auto w-36">
            <FoxCtaMascot className="aspect-[441.75/516.723] w-full overflow-visible [&_.fox-point]:[--point-angle:0deg]" />
          </div>
          <h1 className="font-display text-3xl">Invitation link unavailable</h1>
          <p className="text-sm leading-relaxed text-muted">
            This invitation may have expired, been cancelled, or already been used. If you accepted it, use the staff sign-in link in your email.
          </p>
        </section>
      </main>
    );
  }

  const expiration = invitation && formatInvitationExpiration(invitation.expires_at, invitation.tenants.timezone);
  const workspaceTenant = !invitation && /^[a-z0-9-]{1,80}$/.test(workspace)
    ? await getTenantBySlug(workspace).catch(() => null)
    : null;
  const tenant = invitation?.tenants ?? (workspaceTenant?.status === "active" ? workspaceTenant : null);
  const theme = tenant ? tenantColorStyle(tenant.brand_color, tenant.secondary_color, tenant.accent_color) : undefined;

  return (
    <main style={theme} className="grid min-h-dvh place-items-center bg-powder px-4 py-6 text-ink sm:py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_16px_48px_-22px_rgb(44_58_75/0.35)] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <aside className="relative flex min-w-0 flex-col justify-between gap-5 border-b border-burnt/15 bg-burnt/8 px-6 py-5 sm:px-8 md:border-r md:border-b-0 md:p-9">
          <div>
            <p className="font-display text-3xl text-burnt-dark">Fides</p>
            {invitation && (
              <div className="mt-4 md:mt-9">
                <p className="text-sm font-semibold text-burnt-dark">Staff invitation</p>
                <h2 className="mt-1 break-words font-display text-2xl leading-tight md:text-3xl">{invitation.tenants.name}</h2>
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm md:mt-5 md:grid md:gap-3">
                  <div>
                    <dt className="text-xs font-medium text-muted">Invited staff member</dt>
                    <dd className="mt-0.5 break-words font-semibold">{invitation.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">Staff role</dt>
                    <dd className="mt-0.5 font-semibold">{staffRoleLabels[invitation.role]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">Invitation expires</dt>
                    <dd className="mt-0.5 font-semibold">{expiration}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
          <div data-reveal="bounce" data-shown="true" className="mx-auto hidden w-44 md:block lg:w-52">
            <FoxCtaMascot className="aspect-[441.75/516.723] w-full overflow-visible [&_.fox-point]:[--point-angle:0deg]" />
          </div>
        </aside>
        <StaffAccessForm key={token || workspace} token={token} workspace={workspace}
          invitedEmail={invitation?.email} />
      </section>
    </main>
  );
}
