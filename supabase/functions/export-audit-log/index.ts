import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse query params from URL or body
    let orgId: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      orgId = url.searchParams.get("org_id");
      startDate = url.searchParams.get("start_date");
      endDate = url.searchParams.get("end_date");
    } else {
      const body = await req.json();
      orgId = body.org_id;
      startDate = body.start_date;
      endDate = body.end_date;
    }

    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 exports per hour per org
    const rl = await checkRateLimit(orgId, "export-audit-log", 10, 3600);
    if (!rl.allowed) {
      return rateLimitResponse(rl.reset_at, corsHeaders);
    }

    // Build query using service role for full access
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = admin
      .from("audit_log")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error: queryError } = await query.limit(5000);
    if (queryError) throw queryError;

    // Build CSV
    const headers = ["Date", "User", "Action", "Resource Type", "Resource Name", "Details"];
    const escapeCSV = (val: string | null | undefined) => {
      if (!val) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (logs ?? []).map((l: any) => {
      const detailsStr = l.details
        ? typeof l.details === "object"
          ? JSON.stringify(l.details)
          : String(l.details)
        : "";
      return [
        new Date(l.created_at).toISOString(),
        escapeCSV(l.user_email),
        escapeCSV(l.action),
        escapeCSV(l.resource_type),
        escapeCSV(l.resource_name),
        escapeCSV(detailsStr),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const today = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ruleshift-audit-log-${today}.csv"`,
      },
    });
  } catch (err) {
    console.error("[export-audit-log] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
