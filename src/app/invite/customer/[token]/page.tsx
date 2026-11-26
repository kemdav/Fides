import type { Metadata } from "next";
import { previewCustomerInviteAction } from "@/app/actions/customers";
import { CustomerInviteAcceptForm } from "@/components/merchant/customers/customer-invite-accept-form";

export const metadata: Metadata = {
  title: "Activate Customer Account · Fides",
  description:
    "Set a password to link your in-person visits to an online account.",
};

export default async function CustomerInviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await previewCustomerInviteAction(token);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-powder p-4">
      <CustomerInviteAcceptForm token={token} preview={preview} />
    </main>
  );
}
