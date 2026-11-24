import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getEligibleBookingStaff } from "../merchant/booking-staff-eligibility.ts";
import type {
  AppointmentServiceOption,
  AppointmentStaffOption,
} from "../../types/appointments";

describe("Merchant booking staff eligibility", () => {
  const staffMembers: AppointmentStaffOption[] = [
    { id: "staff-1", fullName: "Sofia Cruz" },
    { id: "staff-2", fullName: "Miguel Tan" },
    { id: "staff-3", fullName: "Lia Ramos" },
  ];

  it("filters staff dropdown to only qualified staff when eligibleStaffIds is non-empty", () => {
    const serviceWithRestrictions: AppointmentServiceOption = {
      id: "svc-1",
      name: "Balayage & gloss",
      priceCents: 150000,
      durationMinutes: 90,
      eligibleStaffIds: ["staff-1", "staff-3"], // only Sofia & Lia
    };

    const result = getEligibleBookingStaff(serviceWithRestrictions, staffMembers);
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((s) => s.fullName),
      ["Sofia Cruz", "Lia Ramos"]
    );
  });

  it("falls back to all active staff when service has 0 rows in staff_service_skills", () => {
    const unrestrictedService: AppointmentServiceOption = {
      id: "svc-2",
      name: "General Consultation",
      priceCents: 50000,
      durationMinutes: 30,
      eligibleStaffIds: [], // unrestricted
    };

    const result = getEligibleBookingStaff(unrestrictedService, staffMembers);
    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((s) => s.fullName),
      ["Sofia Cruz", "Miguel Tan", "Lia Ramos"]
    );
  });

  it("returns no options if the assigned staff member is absent from the active roster", () => {
    const result = getEligibleBookingStaff({ eligibleStaffIds: ["inactive-staff"] }, staffMembers);
    assert.deepEqual(result, []);
  });

  it("returns no options until a service is selected", () => {
    assert.deepEqual(getEligibleBookingStaff(undefined, staffMembers), []);
  });
});
