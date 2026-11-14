import type { Metadata } from "next";
import { VerificationWorkspace } from "@/components/admin/verification-workspace";
import { loadAdminSnapshot } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Merchant verification",
};

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const { submission } = await searchParams;
  const snapshot = await loadAdminSnapshot();

  return (
    <VerificationWorkspace
      key={submission ?? "default"}
      submissions={snapshot.submissions}
      now={Date.parse(snapshot.now)}
      initialSelectedId={submission}
    />
  );
}
