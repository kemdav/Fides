"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { StaffSuccessDialog } from "@/components/merchant/staff/staff-confirmation-dialog";

export function ApplicationReceivedDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (searchParams.get("application") !== "received") return null;

  function dismiss() {
    const remaining = new URLSearchParams(searchParams.toString());
    remaining.delete("application");
    const query = remaining.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  return (
    <StaffSuccessDialog
      title="Application received."
      description="An email will be sent once your account is approved so you can set up your business website."
      onClose={dismiss}
    />
  );
}
