"use client";

import * as React from "react";
import Image from "next/image";
import { Icon } from "@/components/admin/icon";
import { Surface } from "@/components/admin/primitives";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";
import { websiteAddress, type PreviewService } from "./setup-data";
import { previewFonts } from "./typography-select";

const sampleServices: PreviewService[] = [
  { id: "haircut", name: "Signature haircut", durationMinutes: 45, priceCents: 65000 },
  { id: "massage", name: "Wellness massage", durationMinutes: 60, priceCents: 120000 },
  { id: "facial", name: "Facial treatment", durationMinutes: 50, priceCents: 95000 },
];

function SiteFrame({ data, device, services, large }: {
  data: WebsiteSettingsData;
  device: "desktop" | "mobile";
  services: PreviewService[];
  large: boolean;
}) {
  const mobile = device === "mobile";
  const name = data.businessName.trim() || "Your business";
  const fonts = previewFonts(data.typography);
  const accent = { backgroundColor: data.accentColor };
  const headingStyle = { fontFamily: fonts.heading };
  const hours = [
    ["Mon–Fri", data.hoursMonFri], ["Saturday", data.hoursSat], ["Sunday", data.hoursSun],
  ].filter(([, value]) => value.trim());
  const address = [data.streetAddress, data.cityProvince, data.postalCode].filter(Boolean).join(", ");
  const showServices = data.showFeaturedServices && services.length > 0;
  const showContact = data.showContactDetails && Boolean(address || data.businessEmail || data.phoneNumber || data.instagram);

  return (
    <div data-preview-device={device} className={`mx-auto w-full overflow-hidden rounded-xl border border-black/5 transition-[max-width] duration-200 ${mobile ? "max-w-[280px] shadow-md" : "max-w-full"}`} style={{ backgroundColor: data.mainColor, fontFamily: fonts.body }}>
      <div className="flex items-center justify-between gap-2 border-b border-black/5 bg-white/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full text-[9px] font-bold text-white" style={accent}>
            {data.logoUrl ? <Image src={data.logoUrl} alt="" fill unoptimized className="bg-white object-contain" /> : data.logoInitials || name.slice(0, 1).toUpperCase()}
          </div>
          <span className="truncate text-sm font-semibold text-ink" style={headingStyle}>{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] text-body">
          {!mobile && <span className="hidden sm:inline">Home</span>}
          {!mobile && showServices && <span className="hidden sm:inline">Services</span>}
          {!mobile && showContact && <span className="hidden sm:inline">Contact</span>}
          <span className="rounded-md px-2.5 py-1 font-bold text-white" style={accent}>Book now</span>
        </div>
      </div>

      <div className={`grid items-center gap-3 p-4 ${mobile ? "grid-cols-1" : "grid-cols-12"} ${large && !mobile ? "sm:p-8" : ""}`}>
        <div className={`min-w-0 space-y-2 ${mobile ? "" : "col-span-7"}`}>
          <p className="break-words text-[9px] font-bold uppercase tracking-wider text-body" style={{ color: data.accentColor }}>{data.businessCategory}</p>
          <h3 className={`break-words font-medium leading-snug text-ink ${large && !mobile ? "text-3xl" : "text-lg"}`} style={headingStyle}>{data.headline.trim() || "A little time for yourself."}</h3>
          <p className={`break-words leading-relaxed text-body ${large && !mobile ? "text-sm" : "text-xs"}`}>{data.supportingMessage || "Make an appointment and discover what makes a visit special."}</p>
          <span className="inline-block rounded-md px-3 py-1 text-[10px] font-semibold text-white" style={accent}>Book an appointment</span>
        </div>
        <div className={`relative overflow-hidden rounded-lg bg-mist ${mobile ? "h-28" : `col-span-5 ${large ? "h-44" : "h-28"}`}`}>
          <Image src={data.coverPhotoUrl || "/images/storefront/hero Image.png"} alt="" fill unoptimized className="object-cover" />
        </div>
      </div>

      {showServices && (
        <div className="space-y-2 p-4" style={{ backgroundColor: data.secondaryColor }}>
          <p className="text-sm font-semibold text-ink" style={headingStyle}>Find your moment of care</p>
          <div className={`grid gap-1.5 ${mobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="min-w-0 rounded border border-black/5 bg-white/90 p-2">
                <p className="break-words text-[10px] font-semibold text-ink">{service.name}</p>
                <p className="text-[9px] text-muted">{service.durationMinutes} min · ₱{(service.priceCents / 100).toLocaleString("en-PH")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.about || showContact || (data.showOpeningHours && hours.length > 0)) && (
        <div className="space-y-2 border-t border-black/5 bg-white/40 p-4 text-xs text-body">
          {data.about && <p className="break-words">{data.about}</p>}
          {showContact && <div className="space-y-1 break-words"><p className="font-semibold text-ink">Contact</p>{address && <p>{address}</p>}<p>{[data.businessEmail, data.phoneNumber, data.instagram].filter(Boolean).join(" · ")}</p></div>}
          {data.showOpeningHours && hours.length > 0 && <div className="space-y-1"><p className="font-semibold text-ink">Opening hours</p>{hours.map(([day, value]) => <p key={day} className="break-words">{day} · {value}</p>)}{data.timeZone && <p>{data.timeZone}</p>}</div>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-black/5 px-4 py-2 text-[10px] text-body">
        <span className="truncate">{name}</span><span className="shrink-0">Powered by Fides</span>
      </div>
    </div>
  );
}

export function LiveSitePreview({ data, services = sampleServices, onExpand, large = false }: {
  data: WebsiteSettingsData;
  services?: PreviewService[];
  onExpand?: () => void;
  large?: boolean;
}) {
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");

  return (
    <Surface className="space-y-3 border border-hairline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon name="settings" className="size-4 text-glyph" /> Live preview</p>
        <div role="group" aria-label="Preview device" className="flex rounded-lg border border-hairline bg-mist p-0.5">
          {(["desktop", "mobile"] as const).map((item) => (
            <button key={item} type="button" aria-pressed={device === item} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize focus-visible:outline-2 focus-visible:outline-burnt ${device === item ? "bg-white text-burnt shadow-xs" : "text-muted hover:text-ink"}`} onClick={() => setDevice(item)}>{item}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-mist px-3 py-1.5">
        <span className="truncate font-mono text-xs text-body">{websiteAddress(data.subdomain)}</span>
        {onExpand && <button type="button" onClick={onExpand} className="shrink-0 rounded-sm text-xs font-semibold text-burnt hover:underline focus-visible:outline-2 focus-visible:outline-burnt">Full preview</button>}
      </div>
      <SiteFrame data={data} device={device} services={services} large={large} />
      {!large && <p className="text-xs text-muted">Draft preview · Visible only to you</p>}
    </Surface>
  );
}
