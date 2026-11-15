import { z } from "zod";

/**
 * Normalizes a single raw environment value:
 *
 * - trims surrounding whitespace
 * - treats empty strings as unset
 * - treats unfilled `.env.example` placeholders (e.g. `<gemini-api-key>`) as unset
 * - treats RFC 2606 reserved example hosts (e.g. `smtp.example.com`) as unset
 *   for `*_HOST` variables
 *
 * This keeps integrations in their development/fallback mode until real
 * credentials are supplied, rather than attempting live network calls with
 * template values copied from `.env.example`.
 */
function normalizeEnvValue(
  key: string,
  value: string | undefined
): string | undefined {
  if (value === undefined) return undefined;

  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  // Unfilled placeholder, e.g. "<gemini-api-key>" or "https://<project-ref>.supabase.co".
  if (/<[^<>]+>/.test(trimmed)) return undefined;

  // Unfilled Resend placeholder from the setup guide: re_xxxxxxxxx
  if (key === "RESEND_API_KEY" && /^re_x+$/i.test(trimmed)) return undefined;

  // Reserved example domains, e.g. "smtp.example.com".
  if (key.endsWith("_HOST") && /(^|\.)example\.(com|org|net)$/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

/** Applies {@link normalizeEnvValue} across an entire environment object. */
function normalizeEnv(
  source: Record<string, string | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    normalized[key] = normalizeEnvValue(key, value);
  }
  return normalized;
}

/**
 * Public environment variables.
 *
 * Each `NEXT_PUBLIC_*` value is referenced literally so Next.js can inline it
 * into the client bundle, then normalized so unfilled placeholders behave as if
 * unset. Missing values fall back to development defaults, so `next build` and
 * `tsc` never fail on an unpopulated `.env` (misconfiguration surfaces at
 * request time instead).
 */
export const publicEnv = {
  supabaseUrl:
    normalizeEnvValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) ?? "",
  // Supabase's current public credential is the "publishable key"
  // (sb_publishable_...). The legacy "anon key" name is accepted as a fallback
  // so either convention works with this scaffold.
  supabaseKey:
    normalizeEnvValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) ??
    normalizeEnvValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) ??
    "",
  siteUrl:
    normalizeEnvValue("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL) ??
    "http://localhost:3000",
  platformDomain:
    normalizeEnvValue(
      "NEXT_PUBLIC_PLATFORM_DOMAIN",
      process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ) ?? "localhost:3000",
} as const;

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

const serverEnvSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    ADMIN_PORTAL_PUBLIC_ACCESS: z.string().optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
    AI_CONCIERGE_TIMEOUT_MS: z.string().optional(),
    // Email delivery. Resend is the default transport when RESEND_API_KEY is set.
    RESEND_API_KEY: z.string().min(1).optional(),
    MAIL_TRANSPORT: z.enum(["resend", "edge", "smtp"]).optional(),
    FIDES_EMAIL_FUNCTION_SECRET: z.string().min(16).optional(),
    PASSWORD_RESET_SECRET: z.string().min(16).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    MAIL_FROM_NAME: z.string().min(1).default("Fides"),
    MAIL_FROM_EMAIL: z.string().min(1).optional(),
    // Sandbox helper: while MAIL_FROM_EMAIL is Resend's test sender (or unset), every email is
    // redirected to this address (your own Resend account email) so the flows can be tested
    // end to end before a domain is verified. Ignored once a real sender is configured.
    MAIL_TEST_RECIPIENT: z.string().email().optional(),
  })
  .transform((env) => ({
    ...env,
    ADMIN_PORTAL_PUBLIC_ACCESS: toBoolean(env.ADMIN_PORTAL_PUBLIC_ACCESS, false),
    AI_CONCIERGE_TIMEOUT_MS: toPositiveInt(env.AI_CONCIERGE_TIMEOUT_MS, 3000),
    SMTP_PORT: toPositiveInt(env.SMTP_PORT, 587),
    SMTP_SECURE: toBoolean(env.SMTP_SECURE, false),
  }));

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (process.env.NODE_ENV === "production") {
    cachedServerEnv ??= serverEnvSchema.parse(normalizeEnv(process.env));
    return cachedServerEnv;
  }
  return serverEnvSchema.parse(normalizeEnv(process.env));
}

export function requireServerEnv(key: keyof ServerEnv): string {
  const value = getServerEnv()[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required server environment variable: ${key}. See .env.example.`);
  }
  return String(value);
}
