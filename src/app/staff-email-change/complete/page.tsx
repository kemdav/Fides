import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Icon } from "@/components/admin/icon";
import { STAFF_EMAIL_CHANGE_RECEIPT } from "@/lib/merchant/staff-email-change";
import { ContinueToSignIn } from "./continue-to-sign-in";

export default async function StaffEmailChangeCompletePage() {
  const receipt = (await cookies()).get(STAFF_EMAIL_CHANGE_RECEIPT)?.value;
  const match = receipt?.match(/^(owner|staff):([a-z0-9-]{0,80})$/);
  if (!match) redirect("/login");

  const [, accountType, workspace] = match;
  const signIn = accountType === "owner"
    ? `/login?switch=1${workspace ? `&workspace=${workspace}` : ""}`
    : `/staff-access${workspace ? `?workspace=${workspace}` : ""}`;

  return (
    <main className="grid min-h-dvh place-items-center bg-powder px-4 py-8 text-ink">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-white p-6 text-center shadow-lg sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-wash text-success">
          <Icon name="check" className="size-8" weight="bold" />
        </span>
        <h1 className="font-display text-3xl">Your email address is verified</h1>
        <p className="text-sm leading-relaxed text-muted">Your sign-in email has been updated. Use your new address and your existing password to sign in.</p>
        <ContinueToSignIn href={signIn} />
      </section>
    </main>
  );
}
