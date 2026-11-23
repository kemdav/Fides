import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  AppointmentServiceOption,
  AppointmentStaffOption,
} from "../../types/appointments";

/**
 * Pure helper mirroring NewAppointmentModal's staff eligibility filtering logic.
 */
function getEligibleStaffForService(
  selectedService: AppointmentServiceOption | null | undefined,
  availableStaff: AppointmentStaffOption[]
): AppointmentStaffOption[] {
  if (!selectedService) {
    return availableStaff;
  }
  if (selectedService.eligibleStaffIds && selectedService.eligibleStaffIds.length > 0) {
    return availableStaff.filter((sm) =>
      selectedService.eligibleStaffIds.includes(sm.id)
    );
  }
  // 0 restrictions configured => all active staff are eligible
  return availableStaff;
}

/**
 * Pure helper mirroring NewAppointmentModal's auto-reset logic on service change.
 */
function resolveStaffOnServiceChange(
  currentStaffName: string,
  newService: AppointmentServiceOption | null | undefined,
  availableStaff: AppointmentStaffOption[]
): string {
  if (!currentStaffName || currentStaffName === "Any available") {
    return currentStaffName;
  }
  const eligible = getEligibleStaffForService(newService, availableStaff);
  const stillEligible = eligible.some((sm) => sm.fullName === currentStaffName);
  return stillEligible ? currentStaffName : "Any available";
}

describe("Appointment Staff Eligibility Filtering (QA #1)", () => {
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

    const result = getEligibleStaffForService(serviceWithRestrictions, staffMembers);
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

    const result = getEligibleStaffForService(unrestrictedService, staffMembers);
    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((s) => s.fullName),
      ["Sofia Cruz", "Miguel Tan", "Lia Ramos"]
    );
  });

  it("auto-resets staff to 'Any available' when switching to a service where the staff is ineligible", () => {
    const newService: AppointmentServiceOption = {
      id: "svc-3",
      name: "Facial treatment",
      priceCents: 90000,
      durationMinutes: 60,
      eligibleStaffIds: ["staff-2"], // only Miguel Tan is qualified
    };

    // Sofia Cruz is currently selected
    const resolved = resolveStaffOnServiceChange("Sofia Cruz", newService, staffMembers);
    assert.equal(resolved, "Any available");
  });

  it("retains the selected staff member when switching to a service where they remain eligible", () => {
    const newService: AppointmentServiceOption = {
      id: "svc-4",
      name: "Haircut",
      priceCents: 45000,
      durationMinutes: 60,
      eligibleStaffIds: ["staff-1", "staff-2"], // Sofia & Miguel
    };

    // Sofia Cruz is currently selected and remains eligible
    const resolved = resolveStaffOnServiceChange("Sofia Cruz", newService, staffMembers);
    assert.equal(resolved, "Sofia Cruz");
  });

  it("retains 'Any available' when switching services", () => {
    const newService: AppointmentServiceOption = {
      id: "svc-5",
      name: "Aromatherapy",
      priceCents: 80000,
      durationMinutes: 45,
      eligibleStaffIds: ["staff-3"],
    };

    const resolved = resolveStaffOnServiceChange("Any available", newService, staffMembers);
    assert.equal(resolved, "Any available");
  });
});
