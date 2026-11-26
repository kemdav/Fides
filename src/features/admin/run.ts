// the one path every admin operation takes: signed-in admin, then valid input, then the work.
// pure on purpose (no next or supabase imports) so it can be tested on its own.
import type { z } from "zod";
import type { AdminIdentity } from "../../lib/admin/identity";
import { codeForStatus, fail, fieldErrorsFrom, ok, type ActionResult } from "../../lib/result.ts";

export type AdminOutcome<T> = { value: T; message?: string };

export type RunAdminDeps = {
  getAdmin: () => Promise<AdminIdentity | null>;
  /** receives anything unexpected; the caller only ever sees a generic message */
  onUnexpected: (error: unknown) => void;
};

/** errors raised on purpose by a service carry an http-like status */
function expectedStatus(error: unknown): number | null {
  if (error instanceof Error && error.name === "ServiceError" && "status" in error && typeof error.status === "number") return error.status;
  return null;
}

export async function runAdmin<S extends z.ZodType, T>(
  deps: RunAdminDeps,
  schema: S,
  raw: unknown,
  work: (input: z.output<S>, admin: AdminIdentity) => Promise<AdminOutcome<T>>
): Promise<ActionResult<T>> {
  try {
    const admin = await deps.getAdmin();
    if (!admin) return fail("UNAUTHENTICATED", "Your admin session has expired. Please log in again.");

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsFrom(parsed.error.issues);
      return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Check the form and try again.", fieldErrors);
    }

    const outcome = await work(parsed.data, admin);
    return ok(outcome.value, outcome.message);
  } catch (error) {
    const status = expectedStatus(error);
    const code = status === null ? "INTERNAL" : codeForStatus(status);
    if (code === "INTERNAL") {
      deps.onUnexpected(error);
      return fail("INTERNAL", "Something went wrong. Please try again.");
    }
    return fail(code, error instanceof Error ? error.message : "The request could not be completed.");
  }
}
