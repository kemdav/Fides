import type { Metadata } from "next";
import type { ReactElement } from "react";
import { BirReportView } from "@/components/merchant/reports/bir-report-view";

export const metadata: Metadata = { title: "BIR Report View" };

export default async function BirReportsPage({ params }: { params: Promise<{ slug: string }> }): Promise<ReactElement> {
  const { slug } = await params;
  return <BirReportView slug={slug} />;
}
