"use client";

import * as React from "react";
import Image from "next/image";
import { WebsiteSettingsData } from "./types";
import { XIcon, ArrowRightIcon } from "./icons";

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WebsiteSettingsData;
}

export function LivePreviewModal({
  isOpen,
  onClose,
  data,
}: LivePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-neutral-300">
        {/* Preview header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 text-white select-none">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            </span>
            <div className="px-3 py-1 rounded-md bg-neutral-800 text-xs font-mono text-neutral-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{data.subdomain}.fides.app</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
          >
            <span>Close preview</span>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Live Client Website Content Container */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            backgroundColor: data.mainColor || "#FFFFEB",
            fontFamily: data.typography.includes("Ovo")
              ? "var(--font-display), Georgia, serif"
              : "inherit",
          }}
        >
          {/* Client Site Navbar */}
          <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-black/5 bg-white/40 backdrop-blur-xs sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: data.accentColor || "#CC5000" }}
              >
                {data.logoInitials || "BV"}
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
                <span className="cursor-pointer hover:text-black">Services</span>
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
              <p className="mt-3 text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans max-w-md">
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
                    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
                  <div className="rounded-xl bg-white/85 p-5 shadow-xs border border-black/5 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-900">
                        Signature haircut
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        45 min · ₱650
                      </p>
                    </div>
                    <span
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: data.accentColor || "#CC5000" }}
                    >
                      View service <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="rounded-xl bg-white/85 p-5 shadow-xs border border-black/5 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-900">
                        Wellness massage
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        60 min · ₱1,200
                      </p>
                    </div>
                    <span
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: data.accentColor || "#CC5000" }}
                    >
                      View service <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="rounded-xl bg-white/85 p-5 shadow-xs border border-black/5 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-900">
                        Facial treatment
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        50 min · ₱950
                      </p>
                    </div>
                    <span
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: data.accentColor || "#CC5000" }}
                    >
                      View service <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Contact Details Section if enabled */}
          {data.showContactDetails && (
            <section className="px-6 sm:px-12 py-8 border-t border-black/5 text-xs text-neutral-600 font-sans">
              <div className="max-w-4xl flex flex-wrap gap-8 items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-900 block mb-0.5">
                    Location
                  </span>
                  <span>
                    {data.streetAddress}, {data.cityProvince}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block mb-0.5">
                    Contact
                  </span>
                  <span>
                    {data.businessEmail} · {data.phoneNumber}
                  </span>
                </div>
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
          <footer className="px-6 sm:px-12 py-6 border-t border-black/10 flex items-center justify-between text-xs text-neutral-600 font-sans">
            <div>{data.businessName || "Bella Vita Salon & Spa"}</div>
            <div className="text-[11px] text-neutral-500">Powered by Fides</div>
          </footer>
        </div>
      </div>
    </div>
  );
}
