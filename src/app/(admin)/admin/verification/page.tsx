import type { Metadata } from "next";
import { VerificationWorkspace } from "@/components/admin/verification-workspace";

export const metadata: Metadata = {
  title: "Merchant verification",
};

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const { submission } = await searchParams;

  return <VerificationWorkspace initialSelectedId={submission} />;
}
