export function getEligibleBookingStaff<T extends { id: string }>(
  service: { eligibleStaffIds: string[] } | undefined,
  staff: T[],
): T[] {
  if (!service) return [];

  // Services with no stored assignments are treated as unrestricted by the booking actions.
  const { eligibleStaffIds } = service;
  return eligibleStaffIds.length === 0
    ? staff
    : staff.filter((member) => eligibleStaffIds.includes(member.id));
}
