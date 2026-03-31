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

function truncate(text: string | null, max: number): string {
  if (!text) return "(no content)";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alert_id, org_source_id } = await req.json();
    if (!alert_id || !org_source_id) {
      return json({ error: "alert_id and org_source_id are required" }, 400);
    }

    // Rate limit: 30 per org per hour (determined after fetching alert)
    // We need the org_id from the alert, so we'll check after fetching it

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch alert
    const { data: alert, error: alertErr } = await admin
      .from("alerts")
      .select("id, title, source_name, organization_id")
      .eq("id", alert_id)
      .single();
    if (alertErr || !alert) {
      console.error("[BRIEF] Alert not found:", alertErr?.message);
      return json({ error: "Alert not found" }, 404);
    }

    // Rate limit: 30 per org per hour
    const rl = await checkRateLimit(alert.organization_id, "generate-brief", 30, 3600);
    if (!rl.allowed) return rateLimitResponse(rl.reset_at, corsHeaders);

    // 2. Fetch two most recent snapshots
    const { data: snapshots } = await admin
      .from("page_snapshots")
      .select("text_content, fetched_at")
      .eq("org_source_id", org_source_id)
      .order("fetched_at", { ascending: false })
      .limit(2);

    const newText = snapshots?.[0]?.text_content ?? null;
    const oldText = snapshots?.[1]?.text_content ?? null;

    // 3. Fetch organization
    const { data: org } = await admin
      .from("organizations")
      .select("industry, company_size, compliance_concern")
      .eq("id", alert.organization_id)
      .single();

    // 4. Fetch source details
    const { data: orgSource } = await admin
      .from("organization_sources")
      .select("is_custom, custom_name, custom_url, source_id, policy_sources ( name, url, category )")
      .eq("id", org_source_id)
      .single();

    const src = orgSource as any;
    const sourceName = src?.is_custom ? (src.custom_name || "Custom source") : (src?.policy_sources?.name || alert.source_name);
    const sourceUrl = src?.is_custom ? src.custom_url : (src?.policy_sources?.url || "Unknown");
    const sourceCategory = src?.is_custom ? "Custom" : (src?.policy_sources?.category || "Unknown");

    // 5. Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[BRIEF] LOVABLE_API_KEY not configured");
      return json({ error: "AI service not configured" }, 500);
    }

    const systemPrompt = `You are a compliance analyst at RuleShift. Generate a structured policy change impact brief for an SMB. Write in plain English, not legal jargon. Be specific and actionable.

You MUST respond with a JSON object with these exact fields:
{
  "severity": "critical|important|informational",
  "summary": "2-3 sentence summary",
  "content": "Full markdown brief with sections: ## What Changed, ## Who Is Affected, ## Required Actions (numbered), ## Deadline, ## Business Impact",
  "tags": ["relevant", "tags"],
  "title": "Brief title"
}

Return ONLY the JSON object, no markdown fences or extra text.`;

    const userMessage = `Analyze this policy change and generate an impact brief.

Source: ${sourceName}
URL: ${sourceUrl}
Category: ${sourceCategory}

Previous content (before change):
${truncate(oldText, 3000)}

Current content (after change):
${truncate(newText, 3000)}

Organization context:
- Industry: ${org?.industry || "Unknown"}
- Company size: ${org?.company_size || "Unknown"}
- Primary compliance concern: ${org?.compliance_concern || "General compliance"}

Generate the impact brief JSON now.`;

    console.log("[BRIEF] Calling AI for alert:", alert_id);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[BRIEF] AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return json({ error: "AI rate limit exceeded, please try again later" }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ error: "AI credits exhausted, please add funds" }, 402);
      }
      return json({ error: "AI service error" }, 500);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("[BRIEF] No content in AI response");
      return json({ error: "AI returned empty response" }, 500);
    }

    // Parse JSON — strip markdown fences if present
    let briefData: any;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
      briefData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[BRIEF] Failed to parse AI JSON:", rawContent);
      return json({ error: "AI returned invalid JSON" }, 500);
    }

    const severity = ["critical", "important", "informational"].includes(briefData.severity)
      ? briefData.severity
      : "informational";

    // 6. Insert brief
    const { data: brief, error: briefErr } = await admin
      .from("briefs")
      .insert({
        organization_id: alert.organization_id,
        alert_id: alert_id,
        title: briefData.title || `Brief: ${alert.title}`,
        source_name: alert.source_name,
        summary: briefData.summary || null,
        content: briefData.content || null,
        tags: Array.isArray(briefData.tags) ? briefData.tags : [],
      })
      .select("id, title, summary, content, tags, created_at")
      .single();

    if (briefErr) {
      console.error("[BRIEF] Insert error:", briefErr.message);
      return json({ error: "Failed to save brief" }, 500);
    }

    // 7. Update alert with brief_id and severity
    await admin
      .from("alerts")
      .update({ brief_id: brief.id, severity })
      .eq("id", alert_id);

    // 8. Activity event
    await admin.from("activity_events").insert({
      organization_id: alert.organization_id,
      event_type: "brief_generated",
      description: `Brief generated: ${brief.title}`,
    });

    // 9b. Audit log
    await admin.from("audit_log").insert({
      organization_id: alert.organization_id,
      user_id: null,
      action: "brief_generated",
      user_email: "system",
      resource_type: "brief",
      resource_id: brief.id,
      resource_name: brief.title,
      details: `AI brief generated for alert from ${alert.source_name}`,
    }).then(() => {});

    // 9. Trigger notifications (fire-and-forget)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ brief_id: brief.id, organization_id: alert.organization_id }),
    }).catch((e) => console.log(`[BRIEF] Notification trigger failed: ${e.message}`));

    console.log("[BRIEF] Generated brief:", brief.id);

    return json({
      brief: { ...brief, severity },
    });
  } catch (err: any) {
    console.error("[BRIEF] Fatal error:", err);
    return json({ error: err.message }, 500);
  }
});
