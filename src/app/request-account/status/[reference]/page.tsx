import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Application status",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const descriptions = {
  pending: "We received your application. We’ll email you when the review is complete.",
  approved: "Your application was approved. Sign in to access your account.",
  rejected: "Your application was declined. Check your email for details. You can submit a new application.",
  suspended: "Access to this account is suspended. Check your email for updates.",
};

async function lookupStatus(reference: string) {
  if (!/^FID-[A-F0-9]{32}$/.test(reference)) return null;

  const admin = createAdminClient();
  const { data: application, error } = await admin.from("account_applications")
    .select("status").eq("reference_code", reference).maybeSingle();
  if (error) throw error;
  if (application) return application.status;

  const { data: rejection, error: rejectionError } = await admin.from("rejected_accounts")
    .select("id").eq("reference_code", reference).limit(1).maybeSingle();
  if (rejectionError) throw rejectionError;
  return rejection ? "rejected" : null;
}

export default async function ApplicationStatusPage({ params }: { params: Promise<{ reference: string }> }) {
  const reference = (await params).reference.trim().toUpperCase();
  let status: Awaited<ReturnType<typeof lookupStatus>> = null;
  let unavailable = false;
  try {
    status = await lookupStatus(reference);
  } catch (error) {
    console.error("Could not load application status", error);
    unavailable = true;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-powder p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Application status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          {status ? (
            <>
              <p className="break-all font-mono text-xs text-muted">{reference}</p>
              <p className="w-fit rounded-full bg-mist px-3 py-1 font-semibold capitalize text-ink">{status}</p>
              <p>{descriptions[status]}</p>
              {status === "approved" && <Link className="font-semibold text-burnt hover:underline" href="/login">Sign in</Link>}
              {status === "rejected" && <Link className="font-semibold text-burnt hover:underline" href="/request-account">Start a new application</Link>}
            </>
          ) : (
            <p>{unavailable ? "Application status is temporarily unavailable. Refresh this page to try again." : "We couldn’t find an application with that reference. Check the reference in your confirmation email."}</p>
          )}
          <Link className="w-fit font-semibold text-burnt hover:underline" href="/reset-request?mode=application">Look up another application</Link>
        </CardContent>
      </Card>
    </main>
  );
}
