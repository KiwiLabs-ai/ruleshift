import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_TIMEOUT_MS = 60000;

const SYSTEM_PROMPT = `You are a policy analyst AI assistant. Your role is to analyze policy change notifications and create clear, concise briefs for decision makers.

When provided with changed policy content, you should:
1. Identify key changes and their implications
2. Highlight any regulatory, compliance, or operational impacts
3. Summarize the main points in a clear, professional manner
4. Flag any items requiring immediate attention

Keep your response focused, actionable, and no longer than 500 words.`;

export interface GenerateBriefParams {
  adminClient: SupabaseClient;
  alertId: string;
  organizationId: string;
  content: string;
  sourceNameFallback?: string;
}

export interface GenerateBriefResult {
  briefId: string;
  briefLength: number;
}

/**
 * Generate an impact brief for an existing alert via Anthropic and persist it
 * to the briefs table, then link the alert via brief_id.
 *
 * Throws on any failure (Anthropic timeout, DB error, missing alert) so the
 * caller decides whether to surface the error to the user or retry.
 */
export async function generateBriefForAlert(
  params: GenerateBriefParams
): Promise<GenerateBriefResult> {
  const { adminClient, alertId, organizationId, content, sourceNameFallback } = params;

  // Look up the alert so we can copy title/source_name onto the brief row.
  const { data: alert, error: alertLookupErr } = await adminClient
    .from("alerts")
    .select("id, title, source_name")
    .eq("id", alertId)
    .single();

  if (alertLookupErr || !alert) {
    throw alertLookupErr || new Error(`Alert not found: ${alertId}`);
  }

  const userMessage = `Please analyze the following policy content change from "${alert.source_name}" and provide a brief summary of the key changes and their implications:\n\n${content}`;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const anthropicCall = client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
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
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  const briefText = response.content[0].type === "text" ? response.content[0].text : "";
  if (!briefText) {
    throw new Error("No brief text generated");
  }

  // Build a short summary (first paragraph or first 300 chars).
  const firstParagraph = briefText.split(/\n\s*\n/)[0] ?? briefText;
  const summary = firstParagraph.length > 300
    ? firstParagraph.substring(0, 297) + "..."
    : firstParagraph;

  const { data: brief, error: briefInsertErr } = await adminClient
    .from("briefs")
    .insert({
      organization_id: organizationId,
      alert_id: alertId,
      title: alert.title,
      source_name: alert.source_name ?? sourceNameFallback ?? "Unknown source",
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
    .eq("id", alertId);

  if (updateAlertErr) throw updateAlertErr;

  // Best-effort activity log + audit entry. Failures here should not abort
  // the brief — it's already written.
  await adminClient
    .from("activity_events")
    .insert({
      organization_id: organizationId,
      event_type: "brief_generated",
      description: `Generated brief for alert: ${alert.title}`,
    })
    .then((r) => {
      if (r.error) console.error("activity_events insert failed:", r.error);
    });

  await adminClient
    .from("audit_log")
    .insert({
      organization_id: organizationId,
      user_id: null,
      action: "brief_generated",
      user_email: null,
      resource_type: "alert",
      resource_id: alertId,
      details: `AI brief generated for alert`,
    })
    .then((r) => {
      if (r.error) console.error("audit_log insert failed:", r.error);
    });

  return { briefId: brief.id, briefLength: briefText.length };
}
