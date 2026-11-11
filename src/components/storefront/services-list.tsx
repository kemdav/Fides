"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ServiceCard, type ServiceCardData } from "./service-card";
import { SearchInput } from "./search-input";

export interface ServicesListProps {
  /** All services available for this tenant. */
  services: ServiceCardData[];
}

export function ServicesList({ services }: ServicesListProps) {
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
    <section className="bg-powder">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12 lg:px-0 lg:py-16">
        {/* Header: title + search */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl leading-[1.15] text-ink lg:text-4xl">
              Services
            </h1>
            <p className="max-w-[440px] text-xs/5 text-muted">
              A little care, just for you. Choose your service and find a time
              that fits.
            </p>
          </div>
          <SearchInput
            onChange={setQuery}
            className="w-full sm:w-64 lg:w-72"
          />
        </div>

        {/* Count row */}
        <div className="mt-6 flex items-center justify-between lg:mt-8">
          <h2 className="text-base font-semibold text-ink">All services</h2>
          <span className="text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "service" : "services"}
          </span>
        </div>

        {/* Cards grid */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard key={service.name} {...service} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-muted">
            No services match your search.
          </p>
        )}

        {/* Bottom helper row */}
        <div className="mt-6 flex flex-col gap-3 text-[10px] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted">
            Select a service to choose your appointment time.
          </p>
          <p>
            <span className="text-muted">Not sure what to choose?</span>{" "}
            <Link
              href="#contact"
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
