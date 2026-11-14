import type { Metadata } from "next";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterFlow />;
}
