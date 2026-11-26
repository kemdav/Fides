import type { SelectOption } from "@/components/ui";

export const statusFilterOptions: SelectOption[] = ["All", "Confirmed", "Pending approval", "Check In"].map((value) => ({
  value,
  label: value === "All" ? "Filter: All" : value,
}));
