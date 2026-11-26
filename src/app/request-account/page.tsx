import type { Metadata } from "next";
import { RegisterFlow } from "../register/register-flow";

export const metadata: Metadata = {
  title: "Request an account",
  robots: { index: false, follow: true },
};

export default function RequestAccountPage() {
  return <RegisterFlow requestAccount />;
}
