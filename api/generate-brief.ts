import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit";

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

    const targetOrgId = bodyOrgId || orgId;
    if (!targetOrgId) {
      return res.status(403).json({ error: "No organization context" });
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

    const response = await client.messages.create({
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

    const briefText = response.content[0].type === "text" ? response.content[0].text : "";

    if (!briefText) {
      throw new Error("No brief text generated");
    }

    const { error: updateAlertErr } = await adminClient
      .from("alerts")
      .update({
        status: "briefed",
        brief: briefText,
        briefed_at: new Date().toISOString(),
      })
      .eq("id", alert_id);

    if (updateAlertErr) throw updateAlertErr;

    const { data: alert } = await adminClient
      .from("alerts")
      .select("organization_source_id, title")
      .eq("id", alert_id)
      .single();

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
