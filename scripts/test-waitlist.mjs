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
import {
  addToWaitlistSchema,
  assignWaitlistSlotSchema,
  cancelWaitlistEntrySchema,
  createDirectWalkInSchema,
} from "../src/lib/validations/waitlist";

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
    waitlistEntryId: "b7e411ea-7279-4bc7-b82b-cf3ce3a00501",
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

test("addToWaitlistSchema enforces non-blank guestName", () => {
  const invalid = addToWaitlistSchema.safeParse({ guestName: "   " });
  assert.equal(invalid.success, false);

  const valid = addToWaitlistSchema.safeParse({ guestName: "Mia Garcia" });
  assert.equal(valid.success, true);
});

test("assignWaitlistSlotSchema requires UUID for entry and valid startsAt", () => {
  const invalid = assignWaitlistSlotSchema.safeParse({
    waitlistEntryId: "not-a-uuid",
    startsAt: "",
  });
  assert.equal(invalid.success, false);

  const valid = assignWaitlistSlotSchema.safeParse({
    waitlistEntryId: "b7e411ea-7279-4bc7-b82b-cf3ce3a00501",
    startsAt: "2026-10-21T10:45:00+08:00",
  });
  assert.equal(valid.success, true);
});

test("createDirectWalkInSchema validates email and customerName", () => {
  const invalidEmail = createDirectWalkInSchema.safeParse({
    customerName: "Paolo Santos",
    customerEmail: "not-an-email",
    startsAt: "2026-10-21T10:45:00+08:00",
  });
  assert.equal(invalidEmail.success, false);

  const valid = createDirectWalkInSchema.safeParse({
    customerName: "Paolo Santos",
    customerEmail: "paolo@example.com",
    startsAt: "2026-10-21T10:45:00+08:00",
  });
  assert.equal(valid.success, true);
});
