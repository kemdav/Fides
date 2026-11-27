import type { Metadata } from "next";
import { getPublicPlans } from "@/lib/plans/public";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: true },
};

export const revalidate = 300;

export default async function RegisterPage() {
  return <RegisterFlow plans={await getPublicPlans()} />;
}
