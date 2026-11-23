import type { Metadata } from "next";
import { ResetRequestFlow } from "./reset-request-flow";

export const metadata: Metadata = {
  title: "Reset request",
  robots: { index: false, follow: false },
};

export default async function ResetRequestPage({ searchParams }: {
  searchParams: Promise<{ mode?: string; ref?: string; email?: string }>;
}) {
  const { mode, ref, email } = await searchParams;
  return <ResetRequestFlow initialMode={mode === "application" || ref ? "application" : "password"}
    initialEmail={typeof email === "string" ? email : ""}
    initialReference={typeof ref === "string" ? ref : ""} />;
}
