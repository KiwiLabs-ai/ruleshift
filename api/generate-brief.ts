import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

// Anthropic round-trip can take up to ~60s; give the function enough budget.
export const maxDuration = 90;

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://ruleshift.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    let orgId: string | null = null;
    let skipRateLimit = false;

    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      skipRateLimit = true;
    } else if (authHeader?.startsWith("Bearer ")) {
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
      orgId = profile.organization_id;
    }

    if (orgId && !skipRateLimit) {
      const rl = await checkRateLimit(orgId, "generate-brief", 30, 3600);
      if (!rl.allowed) {
        const rlInfo = rateLimitJson(rl.reset_at);
        return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
      }
    }

    const { alert_id, organization_id: bodyOrgId, content, source_name } = req.body;

    // Cron callers (skipRateLimit) may pass org_id in the body; user callers must use their own org
    const targetOrgId = skipRateLimit ? (bodyOrgId || orgId) : orgId;
    if (!targetOrgId) {
      return res.status(403).json({ error: "No organization context. User has no organization." });
    }

    if (!alert_id || !content) {
      return res.status(400).json({ error: "alert_id and content are required" });
    }

    const systemPrompt = `You are a policy analyst AI assistant. Your role is to analyze policy change notifications and create clear, concise briefs for decision makers.

When provided with changed policy content, you should:
1. Identify key changes and their implications
2. Highlight any regulatory, compliance, or operational impacts
3. Summarize the main points in a clear, professional manner
4. Flag any items requiring immediate attention

Keep your response focused, actionable, and no longer than 500 words.`;

    const userMessage = `Please analyze the following policy content change from "${source_name}" and provide a brief summary of the key changes and their implications:\n\n${content}`;

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const ANTHROPIC_TIMEOUT_MS = 60000;
    const anthropicCall = client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("Anthropic API timeout")),
        ANTHROPIC_TIMEOUT_MS
      );
    });

    let response: Awaited<typeof anthropicCall>;
    try {
      response = await Promise.race([anthropicCall, timeoutPromise]);
    } catch (timeoutErr) {
      if ((timeoutErr as Error).message === "Anthropic API timeout") {
        console.error("generate-brief: Anthropic API timed out after", ANTHROPIC_TIMEOUT_MS, "ms");
        return res.status(504).json({ error: "Brief generation timed out. Please try again." });
      }
      throw timeoutErr;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    const briefText = response.content[0].type === "text" ? response.content[0].text : "";

    if (!briefText) {
      throw new Error("No brief text generated");
    }

    // Look up the alert so we can copy title/source_name onto the brief row.
    const { data: alert, error: alertLookupErr } = await adminClient
      .from("alerts")
      .select("id, title, source_name, org_source_id")
      .eq("id", alert_id)
      .single();

    if (alertLookupErr || !alert) {
      throw alertLookupErr || new Error("Alert not found");
    }

    // Build a short summary (first paragraph or first 300 chars).
    const firstParagraph = briefText.split(/\n\s*\n/)[0] ?? briefText;
    const summary = firstParagraph.length > 300
      ? firstParagraph.substring(0, 297) + "..."
      : firstParagraph;

    const { data: brief, error: briefInsertErr } = await adminClient
      .from("briefs")
      .insert({
        organization_id: targetOrgId,
        alert_id,
        title: alert.title,
        source_name: alert.source_name ?? source_name ?? "Unknown source",
        summary,
        content: briefText,
      })
      .select("id")
      .single();

    if (briefInsertErr || !brief?.id) {
      throw briefInsertErr || new Error("Failed to insert brief");
    }

    const { error: updateAlertErr } = await adminClient
      .from("alerts")
      .update({ brief_id: brief.id })
      .eq("id", alert_id);

    if (updateAlertErr) throw updateAlertErr;

    if (alert) {
      await adminClient.from("activity_events").insert({
        organization_id: targetOrgId,
        event_type: "brief_generated",
        description: `Generated brief for alert: ${alert.title}`,
      });

      await adminClient.from("audit_log").insert({
        organization_id: targetOrgId,
        user_id: null,
        action: "brief_generated",
        user_email: null,
        resource_type: "alert",
        resource_id: alert_id,
        details: `AI brief generated for alert`,
      }).then(() => {});
    }

    fetch(`${process.env.APP_URL}/api/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        organization_id: targetOrgId,
        alert_id,
        type: "brief_ready",
        message: "Policy brief has been generated",
      }),
    }).catch((err) => {
      console.error("Failed to send notification:", err);
    });

    return res.status(200).json({
      success: true,
      alert_id,
      brief_length: briefText.length,
    });
  } catch (err) {
    console.error("generate-brief error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
