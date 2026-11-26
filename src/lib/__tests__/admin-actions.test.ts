import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { runAdmin, type RunAdminDeps } from "../../features/admin/run.ts";
import { rejectApplicationInput, saveTierInput, tenantAccessInput, BULK_MAX } from "../../features/admin/schema.ts";
import { redact } from "../log.ts";
import { codeForStatus } from "../result.ts";

const ADMIN = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", email: "admin@example.test", displayName: "Test Admin" };
const ID = "11111111-1111-4111-8111-111111111111";
const schema = z.strictObject({ n: z.number() });

function deps(signedIn: boolean) {
  const unexpected: unknown[] = [];
  const value: RunAdminDeps = { getAdmin: async () => (signedIn ? ADMIN : null), onUnexpected: (e) => unexpected.push(e) };
  return { value, unexpected };
}

class ServiceError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

describe("runAdmin", () => {
  it("refuses a caller who is not an admin before looking at the input or doing work", async () => {
    let worked = false;
    const result = await runAdmin(deps(false).value, schema, "not even an object", async () => {
      worked = true;
      return { value: null };
    });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.code, "UNAUTHENTICATED");
    assert.equal(worked, false);
  });

  it("rejects invalid input with field errors and does no work", async () => {
    let worked = false;
    const result = await runAdmin(deps(true).value, schema, { n: "1" }, async () => {
      worked = true;
      return { value: null };
    });
    assert.ok(!result.ok && result.code === "VALIDATION" && result.fieldErrors?.n);
    assert.equal(worked, false);
  });

  it("passes parsed input and the admin to the work", async () => {
    const result = await runAdmin(deps(true).value, schema, { n: 2 }, async ({ n }, admin) => ({ value: n * 2, message: admin.displayName }));
    assert.deepEqual(result, { ok: true, value: 4, message: "Test Admin" });
  });

  it("keeps the message of an expected error and maps its status", async () => {
    const { value, unexpected } = deps(true);
    const result = await runAdmin(value, schema, { n: 1 }, async () => {
      throw new ServiceError("Only pending applications can be approved.", 409);
    });
    assert.ok(!result.ok && result.code === "CONFLICT" && result.error === "Only pending applications can be approved.");
    assert.equal(unexpected.length, 0);
  });

  it("hides the details of unexpected and server errors", async () => {
    for (const thrown of [new Error("duplicate key owner@example.test"), new ServiceError("Could not load (relation x)", 500)]) {
      const { value, unexpected } = deps(true);
      const result = await runAdmin(value, schema, { n: 1 }, async () => {
        throw thrown;
      });
      assert.ok(!result.ok && result.code === "INTERNAL" && result.error === "Something went wrong. Please try again.");
      assert.deepEqual(unexpected, [thrown]);
    }
  });

  it("maps unknown statuses to INTERNAL", () => {
    assert.equal(codeForStatus(404), "NOT_FOUND");
    assert.equal(codeForStatus(502), "INTERNAL");
  });
});

describe("admin input schemas", () => {
  it("needs a real reason, trimmed", () => {
    assert.equal(rejectApplicationInput.safeParse({ applicationId: ID, reason: "   short   " }).success, false);
    assert.equal(rejectApplicationInput.safeParse({ applicationId: ID, reason: "The permit has expired." }).success, true);
  });

  it("rejects unknown fields, so a client cannot choose who made a decision", () => {
    const input = { applicationId: ID, reason: "The permit has expired.", actor: "someone else" };
    assert.equal(rejectApplicationInput.safeParse(input).success, false);
  });

  it("bounds bulk actions and checks every id", () => {
    const base = { access: "suspended", reason: "Payment is overdue by a month." };
    assert.equal(tenantAccessInput.safeParse({ ...base, applicationIds: [] }).success, false);
    assert.equal(tenantAccessInput.safeParse({ ...base, applicationIds: ["1 or 1=1"] }).success, false);
    assert.equal(tenantAccessInput.safeParse({ ...base, applicationIds: Array(BULK_MAX + 1).fill(ID) }).success, false);
    assert.equal(tenantAccessInput.safeParse({ ...base, applicationIds: [ID] }).success, true);
  });

  it("needs a positive price and whole limits", () => {
    const tier = { name: "Basic", price: 499, staffLimit: 3, locationLimit: null };
    assert.equal(saveTierInput.safeParse(tier).success, true);
    assert.equal(saveTierInput.safeParse({ ...tier, price: 0 }).success, false);
    assert.equal(saveTierInput.safeParse({ ...tier, staffLimit: 1.5 }).success, false);
  });
});

describe("log redaction", () => {
  it("removes email addresses and phone numbers", () => {
    assert.equal(redact("duplicate owner@example.test phone +63 917 100 0001"), "duplicate [email] phone [number]");
  });
});
