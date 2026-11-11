"use client";

import { sampleSubmissions } from "@/lib/admin/verification";
import { ReviewQueue } from "../review-queue";

export function OverviewQueue() {
  return (
    <ReviewQueue
      title="Verification queue"
      submissions={sampleSubmissions}
      hrefFor={(submission) => `/admin/verification?submission=${submission.id}`}
    />
  );
}
