import assert from "node:assert/strict";
import { test } from "node:test";
import { checkInCodeSchema } from "../../features/check-in/schema.ts";

test("check-in accepts a complete appointment code from a scan or manual entry", () => {
  const code = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.equal(checkInCodeSchema.parse(` ${code.toUpperCase()} `), code);
});

test("check-in rejects abbreviated references and unrelated QR payloads", () => {
  assert.equal(checkInCodeSchema.safeParse("AAAAAAAA").success, false);
  assert.equal(checkInCodeSchema.safeParse("https://example.com").success, false);
});
