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

  // Unfilled placeholder, e.g. "<gemini-api-key>" or "<smtp-password>".
  if (/^<.+>$/.test(trimmed)) return undefined;

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

/** Coerces `undefined` / `""` / numeric strings into a positive integer. */
const coercePositiveInt = (fallback: number) =>
  z
    .unknown()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return fallback;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    })
    .pipe(z.number().int().positive());

/** Coerces common truthy strings ("true", "1") into a boolean. */
const coerceBoolean = (fallback: boolean) =>
  z.unknown().transform((value) => {
    if (value === undefined || value === null || value === "") return fallback;
    return value === true || value === "true" || value === "1";
  });

const serverEnvSchema = z.object({
  // Secrets whose presence is validated by the integration that needs them.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),

  // Gemini configuration.
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  AI_CONCIERGE_TIMEOUT_MS: coercePositiveInt(3000),

  // SMTP configuration.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: coercePositiveInt(587),
  SMTP_SECURE: coerceBoolean(false),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM_NAME: z.string().min(1).default("Fides"),
  MAIL_FROM_EMAIL: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

/**
 * Parses and caches server-only environment variables. Called lazily by server
 * integrations (AI, mailer, admin client) so it is never evaluated during the
 * client bundle or a plain type-check.
 */
export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= serverEnvSchema.parse(normalizeEnv(process.env));
  return cachedServerEnv;
}

/** Reads a required server env var, throwing a descriptive error when absent. */
export function requireServerEnv(key: keyof ServerEnv): string {
  const value = getServerEnv()[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required server environment variable: ${key}. See .env.example.`
    );
  }
  return String(value);
}
