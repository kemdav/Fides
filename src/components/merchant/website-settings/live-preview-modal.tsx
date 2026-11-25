"use client";

import * as React from "react";
import Image from "next/image";
import { WebsiteSettingsData, PreviewServiceItem } from "./types";
import { XIcon, ArrowRightIcon } from "./icons";

const FALLBACK_SERVICES: PreviewServiceItem[] = [
  {
    id: "fallback-1",
    name: "Signature haircut",
    durationMinutes: 45,
    priceCents: 65000,
  },
  {
    id: "fallback-2",
    name: "Wellness massage",
    durationMinutes: 60,
    priceCents: 120000,
  },
  {
    id: "fallback-3",
    name: "Facial treatment",
    durationMinutes: 50,
    priceCents: 95000,
  },
];

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WebsiteSettingsData;
  services?: PreviewServiceItem[];
  fonts?: { heading: string; body: string };
}

export function LivePreviewModal({
  isOpen,
  onClose,
  data,
  services = [],
  fonts,
}: LivePreviewModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bodyFont = fonts && { fontFamily: fonts.body };

  const displayedServices =
    services.length > 0 ? services.slice(0, 3) : FALLBACK_SERVICES;

  const locationText = [data.streetAddress, data.cityProvince]
    .filter(Boolean)
    .join(", ");
  const contactText = [data.businessEmail, data.phoneNumber]
    .filter(Boolean)
    .join(" · ");

  return (
    <dialog
      ref={dialogRef}
      aria-label="Full website preview"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden rounded-2xl border border-neutral-300 bg-white p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:w-[calc(100%-3rem)]"
    >
      <div className="flex max-h-[92dvh] min-w-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 bg-neutral-900 px-3 py-3.5 text-white select-none sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="hidden shrink-0 gap-1.5 sm:flex">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            </span>
            <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-neutral-800 px-2.5 py-1 font-mono text-xs text-neutral-300">
              <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate">{data.subdomain || "your-business"}.fides.app</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-white sm:px-3"
          >
            <span>Close preview</span>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Live Client Website Content Container */}
        <div
          role="region"
          aria-label="Website preview content"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-600"
          style={{
            backgroundColor: data.mainColor || "#FFFFEB",
            fontFamily: fonts?.heading ?? (data.typography.includes("Ovo")
              ? "var(--font-display), Georgia, serif"
              : "inherit"),
          }}
        >
          {/* Client Site Navbar */}
          <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-black/5 bg-white/40 backdrop-blur-xs sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div
                className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                style={{ backgroundColor: data.accentColor || "#CC5000" }}
              >
                {data.logoUrl ? (
                  <Image
                    src={data.logoUrl}
                    alt={`${data.businessName || "Business"} logo`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  data.logoInitials || "BV"
                )}
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-neutral-900">
                  {data.businessName || "Bella Vita"}
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                  {data.businessCategory || "BEAUTY & WELLNESS"}
                </span>
              </div>
            </div>

            <nav className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-5 text-xs font-medium text-neutral-700">
                <span className="cursor-pointer hover:text-black">Home</span>
                <span className="cursor-pointer hover:text-black">
                  Services
                </span>
                <span className="cursor-pointer hover:text-black">Contact</span>
              </div>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition"
                style={{ backgroundColor: data.accentColor || "#CC5000" }}
              >
                Book now
              </button>
            </nav>
          </header>

          {/* Hero Section */}
          <section className="px-6 sm:px-12 py-10 sm:py-16 max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <span
                className="inline-block text-[11px] uppercase tracking-widest font-bold mb-2.5"
                style={{ color: data.accentColor || "#CC5000" }}
              >
                {data.businessCategory || "BEAUTY & WELLNESS"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-900 leading-tight">
                {data.headline || "A little time for yourself."}
              </h1>
              <p className="mt-3 text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans max-w-md" style={bodyFont}>
                {data.supportingMessage ||
                  "Thoughtful care, experienced specialists, and effortless booking."}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full text-xs font-semibold text-white shadow-md hover:opacity-95 transition"
                  style={{ backgroundColor: data.accentColor || "#CC5000" }}
                >
                  Book an appointment
                </button>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden relative shadow-sm border border-black/10">
                <Image
                  src={
                    data.coverPhotoUrl ||
                    "/images/storefront/hero Image.png"
                  }
                  alt="Salon Studio"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          </section>

          {/* Featured Services Section */}
          {data.showFeaturedServices && (
            <section
              className="px-6 sm:px-12 py-10 sm:py-14 border-t border-black/5"
              style={{ backgroundColor: data.secondaryColor || "#ADD8E6" }}
            >
              <div className="max-w-4xl">
                <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-6">
                  Find your moment of care
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans" style={bodyFont}>
                  {displayedServices.map((svc) => {
                    const formattedPrice = `₱${Math.round(
                      svc.priceCents / 100,
                    ).toLocaleString("en-PH")}`;
                    return (
                      <div
                        key={svc.id}
                        className="rounded-xl bg-white/85 p-5 shadow-xs border border-black/5 flex flex-col justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-sm text-neutral-900">
                            {svc.name}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            {svc.durationMinutes} min · {formattedPrice}
                          </p>
                        </div>
                        <span
                          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: data.accentColor || "#CC5000" }}
                        >
                          View service{" "}
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Contact Details Section if enabled */}
          {data.showContactDetails && (
            <section className="px-6 sm:px-12 py-8 border-t border-black/5 text-xs text-neutral-600 font-sans" style={bodyFont}>
              <div className="max-w-4xl flex flex-wrap gap-8 items-center justify-between">
                {locationText && (
                  <div>
                    <span className="font-semibold text-neutral-900 block mb-0.5">
                      Location
                    </span>
                    <span>{locationText}</span>
                  </div>
                )}
                {contactText && (
                  <div>
                    <span className="font-semibold text-neutral-900 block mb-0.5">
                      Contact
                    </span>
                    <span>{contactText}</span>
                  </div>
                )}
                {data.showOpeningHours && (
                  <div>
                    <span className="font-semibold text-neutral-900 block mb-0.5">
                      Hours
                    </span>
                    <span>
                      Mon-Fri: {data.hoursMonFri} · Sat: {data.hoursSat}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Client Site Footer */}
          <footer className="px-6 sm:px-12 py-6 border-t border-black/10 flex items-center justify-between text-xs text-neutral-600 font-sans" style={bodyFont}>
            <div>{data.businessName || "Bella Vita Salon & Spa"}</div>
            <div className="text-[11px] text-neutral-500">Powered by Fides</div>
          </footer>
        </div>
      </div>
    </dialog>
  );
}
