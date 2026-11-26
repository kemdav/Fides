import "server-only";
import type { z } from "zod";
import { runAdmin, type AdminOutcome } from "@/features/admin/run";
import { logError } from "@/lib/log";
import type { ActionResult } from "@/lib/result";
import { getAdmin } from "./access";
import type { AdminIdentity } from "./identity";

/** The shared guard and input check for admin server actions. */
export function adminAction<S extends z.ZodType, T>(
  name: string,
  schema: S,
  raw: unknown,
  work: (input: z.output<S>, admin: AdminIdentity) => Promise<AdminOutcome<T>>
): Promise<ActionResult<T>> {
  return runAdmin({ getAdmin, onUnexpected: (error) => logError(`admin.${name}`, error) }, schema, raw, work);
}
