import assert from "node:assert/strict";
import test from "node:test";
import {
  getManilaDateISO,
  formatManilaDateLabel,
  formatManilaTime,
} from "../src/lib/walk-ins";
import {
  addToWaitlistAction,
  cancelWaitlistEntryAction,
  assignWaitlistSlotAction,
  getStaffBusySlotsAction,
} from "../src/app/actions/waitlist";

test("getManilaDateISO returns YYYY-MM-DD format", () => {
  const iso = getManilaDateISO(new Date("2026-10-21T02:00:00Z"));
  assert.equal(iso, "2026-10-21");
});

test("formatManilaDateLabel formats correctly", () => {
  const label = formatManilaDateLabel("2026-10-21");
  assert.equal(label, "October 21, 2026");
});

test("formatManilaTime formats correctly in UTC+8", () => {
  // 10:45 AM UTC+8 is 02:45 UTC
  const formatted = formatManilaTime("2026-10-21T02:45:00Z");
  assert.equal(formatted, "10:45 AM");
});

test("addToWaitlistAction requires customer name", async () => {
  const result = await addToWaitlistAction({ guestName: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /Customer name is required/i);
  }
});

test("cancelWaitlistEntryAction requires waitlistEntryId", async () => {
  const result = await cancelWaitlistEntryAction({ waitlistEntryId: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /waiting-list entry is required/i);
  }
});

test("assignWaitlistSlotAction requires entry id and valid startsAt", async () => {
  const noEntry = await assignWaitlistSlotAction({
    waitlistEntryId: "",
    startsAt: "invalid",
  });
  assert.equal(noEntry.success, false);

  const invalidDate = await assignWaitlistSlotAction({
    waitlistEntryId: "entry-1",
    startsAt: "not-a-date",
  });
  assert.equal(invalidDate.success, false);
});

test("getStaffBusySlotsAction requires staffId and dateISO", async () => {
  const result = await getStaffBusySlotsAction({
    staffId: "",
    dateISO: "",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error, /Staff and date are required/i);
  }
});
