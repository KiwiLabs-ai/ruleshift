import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { createTwoFilesPatch } from "diff";

const ANTHROPIC_TIMEOUT_MS = 60000;
const MAX_DIFF_CHARS = 18000;

const FIRST_SEEN_SYSTEM_PROMPT = `You are a policy analyst AI writing impact briefs for decision makers.

You will receive raw scraped text from a regulatory or policy webpage. The text
may be noisy (navigation, footers, scripts) — extract the substantive policy
content and ignore boilerplate. If the text contains no recognizable policy
content at all, say so plainly under "What Changed" rather than refusing.

ALWAYS structure your response using EXACTLY these five section headers, in
this order, written as markdown level-2 headings with no extra prefix or
numbering:

## What Changed
A 2-4 sentence plain-language summary of what's new or different.

## Who Is Affected
A 1-3 sentence description of which organizations, roles, or activities
this affects.

## Required Actions
A numbered list of 2-5 concrete next steps a compliance or operations team
should take. Use "1.", "2.", "3." etc. — one action per line, no sub-bullets.

## Deadline
The most relevant date (compliance, effective, comment-period close). If no
date is mentioned, write "Not specified".

## Business Impact
2-4 sentences on operational, financial, or reputational impact.

Rules:
- Use the exact section headers above. Do not add extra sections or omit any.
- Do not wrap the brief in a top-level title or preamble.
- Do not use bold (**...**) inside section bodies.
- Keep the entire brief under 500 words.`;

const DIFF_SYSTEM_PROMPT = `You are a policy analyst AI writing impact briefs for decision makers.

You will receive a unified diff between an OLD and NEW snapshot of a regulatory
or policy webpage. Lines starting with "+" were added. Lines starting with "-"
were removed. Lines without a prefix are unchanged context.

Your job is to summarize the SUBSTANTIVE policy changes shown in the diff —
not the cosmetic ones. Cosmetic changes you should ignore include:
- Page timestamps, "last updated" labels, build/version strings
- Navigation, header, footer, breadcrumb edits
- CSS class renames or markup reshuffling that didn't change wording
- Counter / view-count / dynamic widget output

If the diff contains ONLY cosmetic changes, write a one-line "What Changed"
section saying "No substantive policy changes detected — only cosmetic page
edits." and put "Not specified" / "None" in the other sections.

ALWAYS structure your response using EXACTLY these five section headers, in
this order, written as markdown level-2 headings with no extra prefix or
numbering:

## What Changed
A 2-4 sentence plain-language summary of the substantive policy changes.

## Who Is Affected
A 1-3 sentence description of which organizations, roles, or activities
this affects.

## Required Actions
A numbered list of 2-5 concrete next steps a compliance or operations team
should take. Use "1.", "2.", "3." etc. — one action per line, no sub-bullets.
If there are no substantive changes, write "1. No action required."

## Deadline
The most relevant date (compliance, effective, comment-period close). If no
date is mentioned, write "Not specified".

## Business Impact
2-4 sentences on operational, financial, or reputational impact. If only
cosmetic changes, write "None — change is not substantive."

Rules:
- Use the exact section headers above. Do not add extra sections or omit any.
- Do not wrap the brief in a top-level title or preamble.
- Do not use bold (**...**) inside section bodies.
- Keep the entire brief under 500 words.`;

export interface GenerateBriefParams {
  adminClient: SupabaseClient;
  alertId: string;
  organizationId: string;
  content: string;
  /**
   * Optional previous snapshot text. When supplied, the brief is generated
   * from the diff between previousContent and content rather than from
   * content alone — so the AI focuses on what *changed*, not what exists.
   */
  previousContent?: string;
  sourceNameFallback?: string;
}

export interface GenerateBriefResult {
  briefId: string;
  briefLength: number;
}

/**
 * Build a unified diff between the old and new snapshots and decide whether
 * the diff is small enough to send to the model. Returns null if the diff
 * is empty/whitespace-only or unusably large.
 */
function buildDiffPayload(previous: string, current: string): string | null {
  const patch = createTwoFilesPatch(
    "previous.txt",
    "current.txt",
    previous,
    current,
    undefined,
    undefined,
    { context: 3 }
  );

  // Drop the file header lines from createTwoFilesPatch — they're noise to
  // the model — and check whether any actual +/- lines remain.
  const lines = patch.split("\n");
  const meaningful = lines.some(
    (l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---")
  );
  if (!meaningful) return null;

  if (patch.length > MAX_DIFF_CHARS) {
    // Truncate but keep it labeled so the prompt can mention it.
    return patch.substring(0, MAX_DIFF_CHARS) + "\n... [diff truncated]";
  }
  return patch;
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
  const { adminClient, alertId, organizationId, content, previousContent, sourceNameFallback } = params;

  // Look up the alert so we can copy title/source_name onto the brief row.
  const { data: alert, error: alertLookupErr } = await adminClient
    .from("alerts")
    .select("id, title, source_name")
    .eq("id", alertId)
    .single();

  if (alertLookupErr || !alert) {
    throw alertLookupErr || new Error(`Alert not found: ${alertId}`);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment");
  }

  // Decide which prompt + payload to use:
  //   - If we have a previous snapshot AND the diff has meaningful +/- lines,
  //     send the diff with the diff-aware prompt.
  //   - Otherwise fall back to "first time we've seen this content" mode:
  //     send the full new content with the original prompt.
  const diffPayload = previousContent ? buildDiffPayload(previousContent, content) : null;

  let systemPrompt: string;
  let userMessage: string;
  if (diffPayload) {
    systemPrompt = DIFF_SYSTEM_PROMPT;
    userMessage = `Source: "${alert.source_name}"\n\nUnified diff between the previous and current snapshots:\n\n${diffPayload}`;
  } else {
    systemPrompt = FIRST_SEEN_SYSTEM_PROMPT;
    userMessage = `Source: "${alert.source_name}"\n\nThis is the first time we are seeing content from this source (no previous snapshot to diff against). Treat the following as the initial baseline and summarize the substantive policy content:\n\n${content}`;
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const anthropicCall = client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    system: systemPrompt,
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
  } catch (anthropicErr) {
    // Surface the full Anthropic error so it survives Vercel log truncation.
    const err = anthropicErr as { status?: number; message?: string; error?: unknown };
    console.error("[brief-core] Anthropic call failed", {
      message: err?.message,
      status: err?.status,
      error: err?.error,
    });
    throw new Error(
      `Anthropic call failed (status=${err?.status ?? "n/a"}): ${err?.message ?? String(anthropicErr)}`
    );
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
