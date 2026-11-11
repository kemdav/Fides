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
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 md:py-16 lg:px-20 lg:py-20">
        {/* Header: title + search */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl leading-[1.15] text-ink sm:text-4xl lg:text-[42px]">
              Services
            </h1>
            <p className="max-w-[440px] text-sm/6 text-muted">
              A little care, just for you. Choose your service and find a time
              that fits.
            </p>
          </div>
          <SearchInput
            onChange={setQuery}
            className="w-full sm:w-72 lg:w-80"
          />
        </div>

        {/* Count row */}
        <div className="mt-8 flex items-center justify-between lg:mt-10">
          <h2 className="text-lg font-semibold text-ink">All services</h2>
          <span className="text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? "service" : "services"}
          </span>
        </div>

        {/* Cards grid */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Select a service to choose your appointment time.
          </p>
          <p className="text-sm">
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

