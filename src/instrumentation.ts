export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { requireServerEnv } = await import("@/lib/env");
    requireServerEnv("REDIS_URL");
  }
}
