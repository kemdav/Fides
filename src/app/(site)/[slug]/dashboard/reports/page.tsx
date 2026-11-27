import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ReportsView } from "@/components/merchant/reports/reports-view";

export const metadata: Metadata = { title: "Merchant Reports" };

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}): Promise<ReactElement> {
  const [{ slug }, { view }] = await Promise.all([params, searchParams]);
  return <ReportsView slug={slug} initialMode={view === "business" ? "business" : "operational"} />;
}
