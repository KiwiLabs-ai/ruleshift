import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

/**
 * Check rate limit for a given identifier + endpoint.
 * Uses the rate_limits table with service role access.
 * Also cleans up expired windows older than 2 hours.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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

/**
 * Build a 429 response with rate limit info.
 */
export function rateLimitResponse(
  resetAt: string,
  corsHeaders: Record<string, string>,
): Response {
  const retryAfter = Math.max(
    1,
    Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000),
  );
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Try again later.",
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
