import type { Metadata } from "next";
import { updatePassword } from "@/app/actions/auth";
import { AuthBanner, AuthCard, AuthPasswordField, AuthSubmit } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

/**
 * Reset Password Page.
 *
 * Rendered after a user clicks a verified password recovery link.
 * Allows entering and confirming a new password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-mist p-4">
      <AuthCard title="Set new password" description="Please enter a strong password with at least 8 characters.">
        <form action={updatePassword} className="flex flex-col gap-4">
          {error ? <AuthBanner title="We could not update your password">{error}</AuthBanner> : null}
          <AuthPasswordField id="password" name="password" label="New password" autoComplete="new-password" placeholder="Enter a new password" required minLength={8} />
          <AuthPasswordField id="confirmPassword" name="confirmPassword" label="Confirm new password" autoComplete="new-password" placeholder="Re-enter the new password" required minLength={8} />
          <AuthSubmit>Update password</AuthSubmit>
        </form>
      </AuthCard>
    </main>
  );
}
