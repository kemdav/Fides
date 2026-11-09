"use client";

import { useMemo, useState } from "react";
import { ReviewQueue } from "@/components/admin/review-queue";

interface AccountRequest {
  id: string;
  referenceCode: string;
  businessName: string;
  category: string;
  slug: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  estimatedStaff: string;
  createdAt: string;
}

export function OverviewQueueClient({ requests }: { requests: AccountRequest[] }) {
  const [tab, setTab] = useState<"pending" | "active" | "suspended" | "archived" | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");

  const filtered = useMemo(() => {
    let result = requests;

    if (tab !== "all") {
      result = result.filter((r) => r.status === tab);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.businessName.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q) ||
          r.referenceCode.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const direction = sort === "oldest" ? 1 : -1;
      return direction * (a.createdAt.localeCompare(b.createdAt) || a.referenceCode.localeCompare(b.referenceCode));
    });

    return result;
  }, [requests, tab, query, sort]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <ReviewQueue
      title="Verification queue"
      submissions={filtered.map(mapToSubmission)}
      selectedId={null}
      onSelect={() => {}}
      className=""
    />
  );
}

function mapToSubmission(req: AccountRequest) {
  const initials = req.businessName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const categoryLabels: Record<string, string> = {
    dental: "Dental Clinic & Orthodontics",
    medical: "Medical & Diagnostic Practice",
    wellness: "Physical Therapy & Wellness",
    salon: "Aesthetics & Personal Care",
    consulting: "Specialist Consultation",
    other: "General Service Provider",
  };

  return {
    id: req.id,
    reference: req.referenceCode,
    initials,
    business: req.businessName,
    category: categoryLabels[req.category] || req.category,
    owner: req.ownerName,
    location: req.address,
    email: req.ownerEmail,
    submittedOn: req.createdAt,
    status: req.status === "pending" ? "pending" : req.status === "active" ? "approved" : "rejected",
    documents: [
      { key: "permit", label: "Business Permit", meta: "PDF · View" },
      { key: "identification", label: "Owner ID", meta: "PDF · View" },
    ],
  };
}