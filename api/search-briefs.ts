import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return res.status(403).json({ error: "No organization found" });
    }

    const orgId = profile.organization_id;
    const { query = "", limit = 20, offset = 0 } = req.body || {};

    if (!query || query.trim().length === 0) {
      const { data: allBriefs, error } = await supabase
        .from("alerts")
        .select("id, title, description, brief, created_at, status, organization_sources(custom_name, custom_url, policy_sources(name, url))")
        .eq("organization_id", orgId)
        .eq("status", "briefed")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const results = (allBriefs ?? []).map((alert: any) => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        brief: alert.brief,
        created_at: alert.created_at,
        status: alert.status,
        source: alert.organization_sources?.custom_name
          ? { name: alert.organization_sources.custom_name, url: alert.organization_sources.custom_url }
          : alert.organization_sources?.policy_sources
          ? { name: alert.organization_sources.policy_sources.name, url: alert.organization_sources.policy_sources.url }
          : null,
      }));

      return res.status(200).json({
        results,
        total: results.length,
      });
    }

    const { data: searchResults, error } = await supabase.rpc("search_briefs", {
      org_id: orgId,
      search_query: query,
      limit_count: limit,
      offset_count: offset,
    });

    if (error) throw error;

    const results = (searchResults ?? []).map((alert: any) => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      brief: alert.brief,
      created_at: alert.created_at,
      status: alert.status,
      source: alert.organization_sources?.custom_name
        ? { name: alert.organization_sources.custom_name, url: alert.organization_sources.custom_url }
        : alert.organization_sources?.policy_sources
        ? { name: alert.organization_sources.policy_sources.name, url: alert.organization_sources.policy_sources.url }
        : null,
    }));

    return res.status(200).json({
      results,
      total: results.length,
    });
  } catch (err) {
    console.error("search-briefs error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
