import type { Metadata } from "next";
import { getStaffInvitation } from "@/lib/merchant/staff-invitations";
import { StaffAccessForm } from "./staff-access-form";

export const metadata: Metadata = {
  title: "Staff access",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function StaffAccessPage({ searchParams }: {
  searchParams: Promise<{ invite?: string | string[]; workspace?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.invite === "string" ? params.invite : "";
  const workspace = typeof params.workspace === "string" ? params.workspace : "";
  const invitation = token ? await getStaffInvitation(token).catch(() => null) : null;
  const invalidInvitation = params.invite !== undefined && !invitation;

  return (
    <main className="grid min-h-dvh place-items-center bg-powder px-4 py-8 text-ink">
      <section className="w-full max-w-md space-y-4 rounded-[14px] border border-line bg-white p-6 shadow-lg">
        <h1 className="font-display text-3xl">{invitation ? "Accept staff invitation" : "Staff sign-in"}</h1>
        {invalidInvitation ? (
          <p className="text-sm text-muted">
            This invitation is unavailable. If you already accepted it, use the staff sign-in link in your email.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {invitation ? `Join ${invitation.tenants.name} on Fides.` : "Sign in to your staff workspace."}
            </p>
            <StaffAccessForm key={token || workspace} token={token} workspace={workspace} invitedEmail={invitation?.email} />
          </>
        )}
      </section>
    </main>
  );
}
