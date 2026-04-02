import { createClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  // Cleanup expired entries (older than 2 hours) — lightweight, runs inline
  admin
    .from("rate_limits")
    .delete()
    .lt("window_start", new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
    .then(() => {});

  // Count requests in current window
  const { count, error } = await admin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString());

  if (error) {
    console.error("[RATE_LIMIT] Query error:", error.message);
    // Fail open — don't block requests if rate limiter is broken
    return { allowed: true, remaining: limit, reset_at: resetAt.toISOString() };
  }

  const currentCount = count ?? 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset_at: resetAt.toISOString(),
    };
  }

  // Record this request
  await admin.from("rate_limits").insert({
    identifier,
    endpoint,
    window_start: now.toISOString(),
  });

  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    reset_at: resetAt.toISOString(),
  };
}

export function rateLimitJson(resetAt: string) {
  const retryAfter = Math.max(
    1,
    Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)
  );
  return {
    status: 429,
    body: {
      error: "Rate limit exceeded. Try again later.",
      retry_after: retryAfter,
    },
    retryAfter: String(retryAfter),
  };
}
