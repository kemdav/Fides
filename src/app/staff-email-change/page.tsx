import type { Metadata } from "next";
import { merchantNameTypography } from "@/lib/brand-colors";
import { getPendingStaffEmailChange } from "@/lib/merchant/staff-email-change";
import { StaffEmailVerificationForm } from "./verification-form";

export const metadata: Metadata = {
  title: "Verify new staff email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function StaffEmailChangePage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: input } = await searchParams;
  const token = typeof input === "string" ? input : "";
  const pending = await getPendingStaffEmailChange(token).catch(() => null);
  const tenant = pending?.tenants;

  return (
    <main className="grid min-h-dvh place-items-center bg-powder px-4 py-8 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
        {tenant && (
          <div className="w-full border-b border-burnt/15 bg-burnt/10 px-6 py-5 text-center text-burnt-dark sm:px-8">
            <p className={merchantNameTypography}>
              {tenant.name}
            </p>
          </div>
        )}
        <div className="p-6 sm:p-8">
          {pending && (
            <header className="mb-6 space-y-2">
              <h1 className="font-display text-[28px] leading-tight tracking-tight sm:text-[32px]">Verify your new email address</h1>
              <p className="max-w-[38ch] text-sm leading-relaxed text-muted">Enter your current password to confirm the new address and open your workspace.</p>
            </header>
          )}
          {pending ? <StaffEmailVerificationForm token={token} email={pending.new_email} /> : (
            <div className="space-y-3">
              <h1 className="font-display text-3xl">Verification link unavailable</h1>
              <p className="text-sm leading-relaxed text-muted">
                This request may have expired, been replaced, or already been used. Ask your workspace administrator for a new link.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
