"use client";

import * as React from "react";
import Image from "next/image";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { FIELD_CLASS, readSetupMedia, type StepFields } from "./setup-data";

export function WebsiteMediaUploader({ label, asset, url, filename, onUpload, onRemove }: {
  label: string;
  asset: "logo" | "cover";
  url?: string;
  filename?: string;
  onUpload: (media: { url: string; filename: string }) => void;
  onRemove: () => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState("");
  const [reading, setReading] = React.useState(false);
  const formats = asset === "logo" ? "PNG, JPEG, WebP or SVG · Up to 2 MB" : "PNG, JPEG or WebP · Up to 5 MB";

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReading(true);
    setError("");
    try {
      onUpload(await readSetupMedia(file, asset));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not open this image.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-outline bg-mist/50 p-3">
        <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-white text-glyph">
          {url ? <Image src={url} fill unoptimized alt={label} className="object-contain" /> : <Icon name="upload" className="size-5" />}
        </div>
        <div className="min-w-40 flex-1">
          {filename && <p className="break-all text-xs font-semibold">{filename}</p>}
          <p className="text-xs text-muted">{formats}</p>
        </div>
        <input ref={input} type="file" aria-label={label} className="hidden" accept={asset === "logo" ? ".png,.jpg,.jpeg,.webp,.svg" : ".png,.jpg,.jpeg,.webp"} onChange={handleFile} />
        <AdminButton size="xs" variant="outline" disabled={reading} onClick={() => input.current?.click()}>{reading ? "Reading…" : url ? "Replace" : "Upload"}</AdminButton>
        {url && <button type="button" disabled={reading} className="text-xs font-semibold text-burnt underline-offset-4 hover:underline" onClick={() => { setError(""); onRemove(); }}>Remove</button>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function LogoUploader({ data, onChange }: StepFields) {
  return (
    <div className="space-y-3">
      <WebsiteMediaUploader label="Business logo" asset="logo" url={data.logoUrl} onUpload={({ url }) => onChange({ logoUrl: url })} onRemove={() => onChange({ logoUrl: "" })} />
      <label className="block space-y-1.5 text-sm font-semibold">
        <span className="block">Logo initials</span>
        <input className={`${FIELD_CLASS} max-w-32`} maxLength={4} value={data.logoInitials} placeholder="BV" onChange={(event) => onChange({ logoInitials: event.target.value.toUpperCase() })} />
        <span className="block text-xs font-normal text-muted">Used when you skip the logo upload.</span>
      </label>
    </div>
  );
}
