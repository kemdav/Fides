// A city and ZIP code can cover multiple barangays. Only infer an explicitly labeled address component.
const barangaySegment = /(^|,\s*)(?:barangay|brgy\.?)\s+([^,]+)(?=,|$)/i;

export function barangayFromStreetAddress(streetAddress: string): string {
  return barangaySegment.exec(streetAddress)?.[2].trim() ?? "";
}

export function formatRegistrationStreetAddress(streetAddress: string, barangay?: string): string {
  const name = barangay?.trim();
  if (!name) return streetAddress;
  if (barangaySegment.test(streetAddress)) {
    return streetAddress.replace(barangaySegment, (_, separator) => `${separator}Barangay ${name}`);
  }
  return `${streetAddress}, Barangay ${name}`;
}
