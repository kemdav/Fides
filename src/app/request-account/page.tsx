import type { Metadata } from "next";
import { getPublicPlans } from "@/lib/plans/public";
import { RegisterFlow } from "../register/register-flow";

export const metadata: Metadata = {
  title: "Request an account",
  robots: { index: false, follow: true },
};

export const revalidate = 300;

export default async function RequestAccountPage() {
  return <RegisterFlow requestAccount plans={await getPublicPlans()} />;
}
