import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-powder text-ink">{children}</div>;
}