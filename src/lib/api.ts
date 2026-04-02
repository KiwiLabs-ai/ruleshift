import { supabase } from "@/integrations/supabase/client";

/**
 * Call a Vercel API route with auth token.
 * Replaces supabase.functions.invoke() calls.
 */
export async function apiCall<T = any>(
  endpoint: string,
  body?: any,
  options?: { method?: string; raw?: boolean }
): Promise<{ data: T | null; error: string | null; rawResponse?: Response }> {
  try {
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

    const response = await fetch(`/api/${endpoint}`, fetchOptions);

    // Return raw response for non-JSON responses (CSV, PDF)
    if (options?.raw) {
      if (!response.ok) {
        const errText = await response.text();
        return { data: null, error: errText };
      }
      return { data: null, error: null, rawResponse: response };
    }

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || `Request failed with status ${response.status}` };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}
