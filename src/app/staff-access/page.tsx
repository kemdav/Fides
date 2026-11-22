import type { Metadata } from "next";
import Image from "next/image";
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
        {invalidInvitation ? (
          <div className="space-y-3 py-2 text-center">
            <Image src="/images/landing/fox-hero.svg" alt="Fides fox mascot waving" width={144} height={147}
              className="mx-auto h-auto w-36" unoptimized />
            <h1 className="font-display text-3xl">Invitation link unavailable</h1>
            <p className="text-sm leading-relaxed text-muted">
              This invitation may have expired, been cancelled, or already been used. If you accepted it, use the staff sign-in link in your email.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl">{invitation ? "Accept staff invitation" : "Staff sign-in"}</h1>
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
