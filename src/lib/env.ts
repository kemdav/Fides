import { z } from "zod";

/**
 * Public environment variables.
 *
 * These are read from `process.env` using static `NEXT_PUBLIC_*` references so
 * Next.js can inline them into the client bundle. Missing values fall back to
 * development defaults, so `next build` and `tsc` never fail on an unpopulated
 * `.env` (the app simply reports misconfiguration at request time).
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  platformDomain: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "localhost:3000",
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
  cachedServerEnv ??= serverEnvSchema.parse(process.env);
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
