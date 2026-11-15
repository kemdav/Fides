"use client";

import type { Submission } from "@/lib/admin/verification";
import { ReviewQueue } from "../review-queue";

export function OverviewQueue({ submissions, now }: { submissions: Submission[]; now: number }) {
  return (
    <ReviewQueue
      title="Verification queue"
      submissions={submissions}
      now={now}
      hrefFor={(submission) => `/admin/verification?submission=${submission.id}`}
    />
  );
}
