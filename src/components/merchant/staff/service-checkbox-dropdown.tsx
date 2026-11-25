"use client";

import { CheckboxDropdown } from "@/components/admin/checkbox-dropdown";

export type StaffServiceOption = {
  id: string;
  name: string;
  duration_minutes?: number;
  price_cents?: number;
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });

export function ServiceCheckboxDropdown({ services, value, onChange, disabled }: {
  services: StaffServiceOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <CheckboxDropdown
      label="Services this person can perform"
      options={services.map((service) => ({
        id: service.id,
        name: service.name,
        description: typeof service.duration_minutes === "number" && typeof service.price_cents === "number"
          ? `${service.duration_minutes} min · ${peso.format(service.price_cents / 100)}`
          : undefined,
      }))}
      value={value}
      onChange={onChange}
      disabled={disabled}
      selectionSummary={(count) => count ? `${count} ${count === 1 ? "service" : "services"} selected` : "Select services"}
      selectedLabel="Selected services"
      emptyMessage="No active services available."
    />
  );
}
