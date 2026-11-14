"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ServiceCard, type ServiceCardData } from "./service-card";
import { SearchInput } from "./search-input";

export interface ServicesListProps {
  /** All services available for this tenant. */
  services: ServiceCardData[];
  contactHref?: string;
}

export function ServicesList({
  services,
  contactHref = "#contact",
}: ServicesListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return services;
    const lower = query.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower)
    );
  }, [services, query]);

  return (
    <section className="flex flex-1 flex-col bg-powder">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 py-10 sm:px-8 sm:py-14 lg:px-[90px] lg:py-20">
        {/* Header: title + search */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
              Services
            </h1>
            <p className="max-w-[560px] text-sm/6 text-muted">
              A little care, just for you. Choose your service and find a time
              that fits.
            </p>
          </div>
          <SearchInput
            onChange={setQuery}
            className="w-full sm:w-64 lg:w-128"
          />
        </div>

        {/* Count row */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">All services</h2>
          <span className="text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "service" : "services"}
          </span>
        </div>

        {/* Cards grid */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.name} {...service} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="flex max-w-sm flex-col items-center text-center">
              <Image
                src="/images/landing/fox-hero.svg"
                alt=""
                width={112}
                height={112}
                className="mb-5 h-24 w-24 object-contain opacity-70"
              />
              <p className="font-display text-2xl text-ink">
                No services match your search.
              </p>
              <p className="mt-2 text-base/6 text-muted">
                Try a different service name or category.
              </p>
            </div>
          </div>
        )}

        {/* Bottom helper row */}
        <div className="mt-auto flex flex-col gap-3 pt-10 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Select a service to choose your appointment time.
          </p>
          <p>
            <span className="text-muted">Not sure what to choose?</span>{" "}
            <Link
              href={contactHref}
              className="font-medium text-burnt hover:text-burnt-dark"
            >
              Contact Us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
