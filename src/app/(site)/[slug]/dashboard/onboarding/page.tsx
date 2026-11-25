import type { Metadata } from "next";
import { SetupWizard } from "@/components/merchant/onboarding/website-setup/setup-wizard";
import { readVerificationState } from "@/components/merchant/onboarding/website-setup/setup-data";
import { loadWebsiteWorkspace } from "@/lib/merchant/website-workspace";

export const metadata: Metadata = {
  title: "Set Up Your Website",
  description: "Guided setup for your first merchant booking website.",
  robots: { index: false, follow: false },
};

export default async function MerchantWebsiteOnboardingPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string; verification?: string }>;
}) {
  const [{ slug }, { step, verification }] = await Promise.all([params, searchParams]);
  const dashboardPath = `/${slug}/dashboard`;
  const onboardingPath = `${dashboardPath}/onboarding`;
  const entryStep = step === "branding" ? 1 : undefined;
  const verificationState = readVerificationState(verification);
  const query = new URLSearchParams();
  if (entryStep) query.set("step", "branding");
  if (verificationState !== "ready") query.set("verification", verificationState);
  const returnTo = query.size ? `${onboardingPath}?${query}` : onboardingPath;
  const { user, tenantId, services } = await loadWebsiteWorkspace(slug, returnTo);

  return (
    <SetupWizard
      key={`${tenantId}:${user.id}`}
      userId={user.id}
      entryStep={entryStep}
      services={services}
      verification={verificationState}
    />
  );
}
