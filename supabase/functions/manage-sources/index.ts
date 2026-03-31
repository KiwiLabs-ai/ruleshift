import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TIER_LIMITS: Record<string, number> = {
  "prod_U5aHbRwGTN7xrH": 10,   // Basic
  "prod_U5aIsM1EfFuyrj": 25,   // Professional
  "prod_U5aIAlewBWuFxK": 999,  // Enterprise (unlimited)
};
const DEFAULT_LIMIT = 5; // Free / no subscription / canceled

async function getSourceLimit(orgId: string): Promise<number> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await adminClient
    .from("subscriptions")
    .select("status, product_id")
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return DEFAULT_LIMIT;
  if (!["active", "trialing"].includes(data.status)) return DEFAULT_LIMIT;
  return TIER_LIMITS[data.product_id ?? ""] ?? DEFAULT_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Get the user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.organization_id) {
      return json({ error: "No organization found. Please complete onboarding." }, 403);
    }
    const orgId = profile.organization_id;

    // Rate limit: 60 per org per hour
    const rl = await checkRateLimit(orgId, "manage-sources", 60, 3600);
    if (!rl.allowed) return rateLimitResponse(rl.reset_at, corsHeaders);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list_catalog": {
        // Get all policy sources with their categories
        const { data: sources, error } = await supabase
          .from("policy_sources")
          .select("id, name, url, description, category")
          .order("category", { ascending: true });
        if (error) throw error;

        // Get which ones the user already watches
        const { data: watched, error: wErr } = await supabase
          .from("organization_sources")
          .select("source_id")
          .eq("organization_id", orgId)
          .not("source_id", "is", null);
        if (wErr) throw wErr;

        const watchedIds = new Set((watched ?? []).map((w: any) => w.source_id));

        const enriched = (sources ?? []).map((s: any) => ({
          ...s,
          is_watched: watchedIds.has(s.id),
          source_categories: { id: s.category, name: s.category },
        }));

        return json({ sources: enriched });
      }

      case "list_categories": {
        // Derive categories from policy_sources
        const { data: sources, error } = await supabase
          .from("policy_sources")
          .select("category")
          .order("category", { ascending: true });
        if (error) throw error;

        const uniqueCats = [...new Set((sources ?? []).map((s: any) => s.category))];
        const categories = uniqueCats.map((name, i) => ({
          id: name,
          name,
          description: null,
          display_order: i,
        }));

        return json({ categories });
      }

      case "get_watchlist": {
        const { data, error } = await supabase
          .from("organization_sources")
          .select("id, status, created_at, source_id, is_custom, custom_name, custom_url, custom_selector, check_frequency, last_checked_at, last_changed_at, last_error, consecutive_errors, policy_sources(id, name, url, description, category)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const watchlist = (data ?? []).map((item: any) => ({
          id: item.id,
          is_active: item.status === "active",
          added_at: item.created_at,
          is_custom: item.is_custom,
          custom_name: item.custom_name,
          custom_url: item.custom_url,
          custom_selector: item.custom_selector,
          check_frequency: item.check_frequency,
          status: item.status,
          last_checked_at: item.last_checked_at,
          last_changed_at: item.last_changed_at,
          last_error: item.last_error,
          consecutive_errors: item.consecutive_errors ?? 0,
          sources: item.policy_sources
            ? {
                id: item.policy_sources.id,
                name: item.policy_sources.name,
                url: item.policy_sources.url,
                description: item.policy_sources.description,
                source_categories: {
                  id: item.policy_sources.category,
                  name: item.policy_sources.category,
                },
              }
            : null,
        }));

        const sourceLimit = await getSourceLimit(orgId);
        return json({ watchlist, sourceLimit });
      }

      case "add_sources": {
        const { source_ids } = body;
        if (!Array.isArray(source_ids) || source_ids.length === 0) {
          return json({ error: "source_ids is required" }, 400);
        }

        // Check current count for limit enforcement
        const { count, error: countErr } = await supabase
          .from("organization_sources")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (countErr) throw countErr;

        const sourceLimit = await getSourceLimit(orgId);
        if ((count ?? 0) + source_ids.length > sourceLimit) {
          return json({ error: `Source limit reached. You can add up to ${sourceLimit} sources on your current plan.` }, 403);
        }

        const rows = source_ids.map((sid: string) => ({
          organization_id: orgId,
          source_id: sid,
          is_custom: false,
        }));

        const { error } = await supabase.from("organization_sources").insert(rows);
        if (error) throw error;

        // Log activity
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "sources_added",
          description: `Added ${source_ids.length} monitoring source${source_ids.length !== 1 ? "s" : ""}`,
        });

        // Audit log
        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: userId,
          action: "source_added",
          user_email: userData.user.email ?? null,
          resource_type: "source",
          details: `Added ${source_ids.length} source(s)`,
        }).then(() => {});

        return json({ success: true, added: source_ids.length });
      }

      case "remove_source": {
        const { source_id, source_name } = body;
        if (!source_id) return json({ error: "source_id is required" }, 400);

        const { error } = await supabase
          .from("organization_sources")
          .delete()
          .eq("id", source_id)
          .eq("organization_id", orgId);
        if (error) throw error;

        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "source_removed",
          description: `Removed source: ${source_name || "Unknown"}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: userId,
          action: "source_removed",
          user_email: userData.user.email ?? null,
          resource_type: "source",
          resource_name: source_name || null,
          details: `Removed source from watchlist`,
        }).then(() => {});

        return json({ success: true });
      }

      case "add_custom_source": {
        const { url, name, check_frequency_hours } = body;
        if (!url || !name) {
          return json({ error: "url and name are required" }, 400);
        }

        // Check limit
        const { count, error: countErr } = await supabase
          .from("organization_sources")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (countErr) throw countErr;

        const sourceLimit = await getSourceLimit(orgId);
        if ((count ?? 0) + 1 > sourceLimit) {
          return json({ error: `Source limit reached. You can add up to ${sourceLimit} sources on your current plan.` }, 403);
        }

        const freq = check_frequency_hours
          ? `${check_frequency_hours}h`
          : "24h";

        const { error } = await supabase.from("organization_sources").insert({
          organization_id: orgId,
          custom_name: name,
          custom_url: url,
          is_custom: true,
          check_frequency: freq,
        });
        if (error) throw error;

        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "custom_source_added",
          description: `Added custom source: ${name}`,
        });

        await adminClient.from("audit_log").insert({
          organization_id: orgId,
          user_id: userId,
          action: "source_added",
          user_email: userData.user.email ?? null,
          resource_type: "source",
          resource_name: name,
          details: `Added custom source: ${url}`,
        }).then(() => {});

        return json({ success: true });
      }

      case "list_templates": {
        const { data, error } = await supabase
          .from("watchlist_templates")
          .select("id, name, description, industries, source_ids, source_count, key_sources")
          .order("name", { ascending: true });
        if (error) throw error;

        const templates = (data ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          industry: (t.industries ?? []).join(", "),
          source_ids: t.source_ids ?? [],
          source_count: t.source_count,
          key_sources: t.key_sources ?? [],
        }));

        return json({ templates });
      }

      case "apply_template": {
        const { template_id } = body;
        if (!template_id) return json({ error: "template_id is required" }, 400);

        // Get template
        const { data: template, error: tErr } = await supabase
          .from("watchlist_templates")
          .select("source_ids")
          .eq("id", template_id)
          .single();
        if (tErr || !template) return json({ error: "Template not found" }, 404);

        const sourceIds = template.source_ids ?? [];
        if (sourceIds.length === 0) return json({ success: true, added: 0 });

        // Filter out already-watched
        const { data: existing, error: eErr } = await supabase
          .from("organization_sources")
          .select("source_id")
          .eq("organization_id", orgId)
          .in("source_id", sourceIds);
        if (eErr) throw eErr;

        const existingIds = new Set((existing ?? []).map((e: any) => e.source_id));
        const newIds = sourceIds.filter((id: string) => !existingIds.has(id));

        if (newIds.length === 0) return json({ success: true, added: 0, message: "All template sources already in watchlist" });

        // Check limit
        const { count, error: countErr } = await supabase
          .from("organization_sources")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (countErr) throw countErr;

        const sourceLimit = await getSourceLimit(orgId);
        if ((count ?? 0) + newIds.length > sourceLimit) {
          return json({ error: `Adding this template would exceed your source limit of ${sourceLimit}.` }, 403);
        }

        const rows = newIds.map((sid: string) => ({
          organization_id: orgId,
          source_id: sid,
          is_custom: false,
        }));

        const { error } = await supabase.from("organization_sources").insert(rows);
        if (error) throw error;

        // Log activity — need template name
        const { data: tmplName } = await supabase
          .from("watchlist_templates")
          .select("name")
          .eq("id", template_id)
          .single();

        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("activity_events").insert({
          organization_id: orgId,
          event_type: "template_applied",
          description: `Applied ${tmplName?.name || "Unknown"} template (${newIds.length} sources)`,
        });

        return json({ success: true, added: newIds.length });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("manage-sources error:", err);
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
