import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTimeManila,
  getManilaDateKey,
  getManilaTodayKey,
  getManilaWeekDays,
  combineDateAndTimeManila,
  mapDbStatusToUi,
  mapDbSourceToUi,
  resolveCustomerName,
  resolveStaffName,
  resolveServiceName,
} from "../date-utils.ts";

describe("Asia/Manila Time Formatting (formatTimeManila)", () => {
  it("formats morning UTC timestamp to Manila 12-hour AM", () => {
    // 02:30 UTC = 10:30 AM Manila
    const formatted = formatTimeManila("2026-11-19T02:30:00.000Z");
    assert.equal(formatted, "10:30 AM");
  });

  it("formats evening UTC timestamp to Manila 12-hour PM", () => {
    // 11:45 UTC = 07:45 PM Manila
    const formatted = formatTimeManila("2026-11-19T11:45:00.000Z");
    assert.equal(formatted, "07:45 PM");
  });

  it("formats noon Manila time correctly (04:00 UTC = 12:00 PM Manila)", () => {
    const formatted = formatTimeManila("2026-11-19T04:00:00.000Z");
    assert.equal(formatted, "12:00 PM");
  });

  it("formats midnight Manila time correctly (16:00 UTC prev day = 12:00 AM Manila)", () => {
    const formatted = formatTimeManila("2026-11-18T16:00:00.000Z");
    assert.equal(formatted, "12:00 AM");
  });

  it("gracefully falls back for invalid date string", () => {
    const formatted = formatTimeManila("invalid-timestamp");
    assert.equal(formatted, "09:00 AM");
  });
});

describe("Midnight to 8:00 AM UTC Boundary Handling (getManilaDateKey)", () => {
  it("correctly identifies Manila next day between 16:00 and 24:00 UTC", () => {
    // 16:00 UTC Nov 18 = 00:00 Nov 19 Manila
    assert.equal(getManilaDateKey("2026-11-18T16:00:00.000Z"), "2026-11-19");

    // 23:59 UTC Nov 18 = 07:59 Nov 19 Manila
    assert.equal(getManilaDateKey("2026-11-18T23:59:00.000Z"), "2026-11-19");
  });

  it("correctly retains previous Manila day before 16:00 UTC", () => {
    // 15:59:59 UTC Nov 18 = 23:59:59 Nov 18 Manila
    assert.equal(getManilaDateKey("2026-11-18T15:59:59.000Z"), "2026-11-18");
  });

  it("returns 10-digit YYYY-MM-DD for today", () => {
    const today = getManilaTodayKey();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("Monday–Sunday Week Buckets (getManilaWeekDays)", () => {
  it("produces Mon through Sun for a Thursday anchor date", () => {
    // Nov 19, 2026 is a Thursday
    const week = getManilaWeekDays("2026-11-19T12:00:00+08:00");
    assert.equal(week.length, 7);

    assert.deepEqual(
      week.map((w) => w.day),
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    );

    assert.equal(week[0].dateKey, "2026-11-16"); // Monday
    assert.equal(week[1].dateKey, "2026-11-17"); // Tuesday
    assert.equal(week[2].dateKey, "2026-11-18"); // Wednesday
    assert.equal(week[3].dateKey, "2026-11-19"); // Thursday
    assert.equal(week[4].dateKey, "2026-11-20"); // Friday
    assert.equal(week[5].dateKey, "2026-11-21"); // Saturday
    assert.equal(week[6].dateKey, "2026-11-22"); // Sunday
  });

  it("produces the same Mon–Sun range when anchored on Sunday", () => {
    // Nov 22, 2026 is Sunday
    const week = getManilaWeekDays("2026-11-22T12:00:00+08:00");
    assert.equal(week[0].dateKey, "2026-11-16");
    assert.equal(week[6].dateKey, "2026-11-22");
  });

  it("produces the same Mon–Sun range when anchored on Monday", () => {
    // Nov 16, 2026 is Monday
    const week = getManilaWeekDays("2026-11-16T12:00:00+08:00");
    assert.equal(week[0].dateKey, "2026-11-16");
    assert.equal(week[6].dateKey, "2026-11-22");
  });
});

describe("Date and Time Combination (combineDateAndTimeManila)", () => {
  it("combines calendar date and 12-hour AM string with +08:00 offset", () => {
    const { startsAt } = combineDateAndTimeManila("2026-11-19", "10:30 AM");
    // 10:30 Manila time = 02:30 UTC
    assert.equal(startsAt, "2026-11-19T02:30:00.000Z");
  });

  it("combines calendar date and 12-hour PM string with +08:00 offset", () => {
    const { startsAt } = combineDateAndTimeManila("2026-11-19", "07:15 PM");
    // 19:15 Manila time = 11:15 UTC
    assert.equal(startsAt, "2026-11-19T11:15:00.000Z");
  });

  it("combines calendar date and 24-hour time string", () => {
    const { startsAt } = combineDateAndTimeManila("2026-11-19", "14:00");
    // 14:00 Manila time = 06:00 UTC
    assert.equal(startsAt, "2026-11-19T06:00:00.000Z");
  });
});

describe("Database Status and Source Mappers", () => {
  it("maps valid database appointment statuses to UI values", () => {
    assert.equal(mapDbStatusToUi("confirmed"), "Confirmed");
    assert.equal(mapDbStatusToUi("checked_in"), "Check In");
    assert.equal(mapDbStatusToUi("check in"), "Check In");
    assert.equal(mapDbStatusToUi("pending_approval"), "Pending approval");
    assert.equal(mapDbStatusToUi("pending"), "Pending approval");
    assert.equal(mapDbStatusToUi("in_service"), "In service");
    assert.equal(mapDbStatusToUi("completed"), "Completed");
    assert.equal(mapDbStatusToUi("cancelled"), "Cancelled");
    assert.equal(mapDbStatusToUi("rejected"), "Cancelled");
    assert.equal(mapDbStatusToUi("expired"), "Cancelled");
    assert.equal(mapDbStatusToUi("no_show"), "Cancelled");
    assert.equal(mapDbStatusToUi(null), "Confirmed");
    assert.equal(mapDbStatusToUi(undefined), "Confirmed");
    assert.equal(mapDbStatusToUi("unknown_status"), "Confirmed");
  });

  it("maps database booking sources to UI values", () => {
    assert.equal(mapDbSourceToUi("walk_in"), "Walk-In");
    assert.equal(mapDbSourceToUi("Walk-In"), "Walk-In");
    assert.equal(mapDbSourceToUi("online"), "Online");
    assert.equal(mapDbSourceToUi("phone"), "Online");
    assert.equal(mapDbSourceToUi(null), "Online");
    assert.equal(mapDbSourceToUi(undefined), "Online");
  });
});

describe("Null and Missing Relationship Fallbacks", () => {
  it("resolves customer name with full_name object or array", () => {
    assert.equal(resolveCustomerName({ full_name: "Juan Dela Cruz" }), "Juan Dela Cruz");
    assert.equal(resolveCustomerName([{ full_name: "Maria Santos" }]), "Maria Santos");
  });

  it("falls back to guest customer if customer is null or empty", () => {
    assert.equal(resolveCustomerName(null), "Guest Customer");
    assert.equal(resolveCustomerName([]), "Guest Customer");
    assert.equal(resolveCustomerName({ full_name: "   " }), "Guest Customer");
  });

  it("extracts customer name from notes when customer object is null", () => {
    const notes = "Customer: Ana Reyes; Phone: 09171234567; Special request";
    assert.equal(resolveCustomerName(null, notes), "Ana Reyes");
  });

  it("resolves staff name with fallback to Unassigned", () => {
    assert.equal(resolveStaffName({ full_name: "Sofia Cruz" }), "Sofia Cruz");
    assert.equal(resolveStaffName([{ full_name: "Miguel Tan" }]), "Miguel Tan");
    assert.equal(resolveStaffName(null), "Unassigned");
    assert.equal(resolveStaffName([]), "Unassigned");
    assert.equal(resolveStaffName({ full_name: "" }), "Unassigned");
  });

  it("resolves service name with fallback to Signature Service", () => {
    assert.equal(
      resolveServiceName([{ services: { name: "Balayage & gloss" } }]),
      "Balayage & gloss",
    );
    assert.equal(
      resolveServiceName({ services: [{ name: "Botanical spa manicure" }] }),
      "Botanical spa manicure",
    );
    assert.equal(resolveServiceName(null), "Signature Service");
    assert.equal(resolveServiceName([]), "Signature Service");
    assert.equal(resolveServiceName([{ services: null }]), "Signature Service");
  });
});
