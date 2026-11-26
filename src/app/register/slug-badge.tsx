"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { slugSchema } from "@/lib/registration/slug";
import { publicEnv } from "@/lib/env";
import { Field, TextInput } from "./parts";

const availabilitySchema = z.object({ available: z.boolean(), reason: z.string() });

export function SlugBadge({ slug, onChange, error }: { slug: string; onChange: (slug: string) => void; error?: string }) {
  const [result, setResult] = useState<{ slug: string; available: boolean; message: string } | null>(null);
  const valid = slugSchema.safeParse(slug).success;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    async function checkAvailability() {
      try {
        const response = await fetch(`/api/applications/validate-slug?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = availabilitySchema.parse(await response.json());
        setResult({ slug, available: data.available, message: data.reason });
      } catch {
        if (!controller.signal.aborted) setResult({ slug, available: false, message: "Availability could not be checked." });
      }
    }
    const timer = setTimeout(() => void checkAvailability(), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, valid]);

  const current = valid && result?.slug === slug ? result : null;
  return (
    <Field label="Storefront subdomain" htmlFor="requestedSlug" error={error} className="sm:col-span-6">
      <TextInput id="requestedSlug" value={slug} onChange={(event) => onChange(event.target.value.toLowerCase())}
        invalid={Boolean(error)} maxLength={63} placeholder="your-business" aria-describedby="slug-availability" />
      <p id="slug-availability" role="status" className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{slug || "your-business"}.{publicEnv.platformDomain}</span>
        {valid && <span className={current?.available ? "rounded-full bg-success/10 px-2 py-1 text-success" : "rounded-full bg-mist px-2 py-1"}>{current?.message ?? "Checking availability…"}</span>}
      </p>
    </Field>
  );
}
