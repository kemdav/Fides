/** The one result shape for actions, services and routes (docs/ARCHITECTURE.md 6.1). */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_STATE"
  | "INTERNAL";

export type FieldErrors = Record<string, string>;

export type ActionResult<T = void> =
  | { ok: true; value: T; message?: string }
  | { ok: false; code: ErrorCode; error: string; fieldErrors?: FieldErrors };

export function ok<T>(value: T, message?: string): ActionResult<T> {
  return { ok: true, value, message };
}

export function fail(code: ErrorCode, error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, code, error, fieldErrors };
}

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: "VALIDATION",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION",
  429: "RATE_LIMITED",
};

export function codeForStatus(status: number): ErrorCode {
  return CODE_BY_STATUS[status] ?? "INTERNAL";
}

/** The first message for each field, keyed by its dotted path. */
export function fieldErrorsFrom(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}
