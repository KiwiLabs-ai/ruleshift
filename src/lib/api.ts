import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Compute exponential backoff with jitter.
 * Attempt 0 -> ~500ms, Attempt 1 -> ~1500ms.
 */
function backoffDelay(attempt: number): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(3, attempt);
  const jitter = Math.random() * 200;
  return exponential + jitter;
}

/**
 * Call a Vercel API route with auth token.
 * Replaces supabase.functions.invoke() calls.
 *
 * Includes automatic retry with exponential backoff on:
 * - Network errors (fetch throws)
 * - 5xx server responses
 *
 * Does NOT retry on 4xx client errors.
 */
export async function apiCall<T = any>(
  endpoint: string,
  body?: any,
  options?: { method?: string; raw?: boolean }
): Promise<{ data: T | null; error: string | null; rawResponse?: Response }> {
  const { data: { session } } = await supabase.auth.getSession();

  const method = options?.method ?? "POST";
  const headers: Record<string, string> = {
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  const fetchOptions: RequestInit = { method, headers };

  if (body && method !== "GET") {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(`/api/${endpoint}`, fetchOptions);
    } catch (err) {
      lastNetworkError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      const message = err instanceof Error ? err.message : "Network error";
      return { data: null, error: message };
    }

    // Retry on 5xx server errors
    if (response.status >= 500 && response.status < 600 && attempt < MAX_RETRIES) {
      await sleep(backoffDelay(attempt));
      continue;
    }

    // Return raw response for non-JSON responses (CSV, PDF)
    if (options?.raw) {
      if (!response.ok) {
        const errText = await response.text();
        return { data: null, error: errText };
      }
      return { data: null, error: null, rawResponse: response };
    }

    try {
      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: data.error || `Request failed with status ${response.status}` };
      }

      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse response";
      return { data: null, error: message };
    }
  }

  // Exhausted retries on network errors (defensive — loop should have returned).
  const message = lastNetworkError instanceof Error ? lastNetworkError.message : "Network error";
  return { data: null, error: message };
}
