import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";
import { generateBriefForAlert } from "./_shared/brief-core.js";

// Single-source user calls await generate-brief, which can take up to ~60s
// for the Anthropic round-trip. Give this function enough budget to cover it.
export const maxDuration = 90;

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://ruleshift.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

function isPrivateIP(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (hostname === "localhost" || hostname === "::1" || hostname === "0.0.0.0") {
    return true;
  }

  if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
    // 127.x.x.x
    if (parts[0] === 127) return true;
    // 10.x.x.x
    if (parts[0] === 10) return true;
    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.x.x
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts[0] === 0) return true;
  }

  return false;
}

function validateUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// Decode the most common HTML entities. Not exhaustive — covers what shows up
// in regulatory pages. Anything else is left as-is.
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// Strip a tag and everything inside it (including the closing tag).
// Used to remove <script>, <style>, <noscript> etc., whose contents are
// useless for policy analysis and would otherwise dominate the extracted text.
function stripBlockElement(html: string, tagName: string): string {
  const re = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  return html.replace(re, " ");
}

// Strip HTML to plain text while preserving paragraph structure so the result
// can be diffed line-by-line. Block-level tags become newlines; inline tags
// become spaces.
function stripHtmlTags(html: string): string {
  const cleaned = stripBlockElement(
    stripBlockElement(
      stripBlockElement(
        // strip HTML comments first
        html.replace(/<!--[\s\S]*?-->/g, " "),
        "script"
      ),
      "style"
    ),
    "noscript"
  );

  // Insert newline markers before/after block-level tags so paragraph
  // structure survives the tag strip.
  const withBreaks = cleaned
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|h[1-6]|section|article|header|footer|nav|main|ul|ol|table|thead|tbody)\b[^>]*>/gi, "\n");

  const text = decodeEntities(withBreaks.replace(/<[^>]*>/g, " "));

  // Per-line cleanup: collapse internal whitespace, trim, drop empty lines.
  // Then collapse runs of >2 blank lines so the result stays compact.
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// Find the substring of `html` enclosed by the first matching tag, by trying
// the supplied tag patterns (regex) in order. Returns null if none match.
// Handles a *single level* of nested tags of the same name (good enough for
// the typical <main>...<main>...</main>...</main> case via greedy matching
// when `greedy` is true).
function extractTagBlock(html: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(re);
  return match ? match[1] : null;
}

function extractByIdOrClass(html: string, attr: "id" | "class", value: string): string | null {
  // Match the opening tag containing id="value" or class="...value..."
  // and pull the inner HTML up to the next matching close tag.
  // Doesn't handle deeply nested same-tag children, but is fine for the
  // single content region most regulatory pages use.
  const tagMatch = html.match(
    new RegExp(`<(\\w+)\\b[^>]*\\b${attr}\\s*=\\s*"[^"]*\\b${value}\\b[^"]*"[^>]*>`, "i")
  );
  if (!tagMatch || tagMatch.index === undefined) return null;

  const tagName = tagMatch[1];
  const startIdx = tagMatch.index + tagMatch[0].length;

  // Walk forward counting opening and closing tags of the same name to find
  // the matching close.
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  const closeRe = new RegExp(`<\\/${tagName}>`, "gi");
  openRe.lastIndex = startIdx;
  closeRe.lastIndex = startIdx;

  let depth = 1;
  let cursor = startIdx;
  while (depth > 0 && cursor < html.length) {
    openRe.lastIndex = cursor;
    closeRe.lastIndex = cursor;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      cursor = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      cursor = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        return html.substring(startIdx, nextClose.index);
      }
    }
  }
  return null;
}

// Try to find the substantive content region of an HTML page. Order of
// preference:
//   1. <main>
//   2. <article>
//   3. id="main-content" / "main_content" / "content" / "main"
//   4. class="main-content" / "content" / "article" / "post" / "entry-content"
//   5. <body> as a last resort
function findMainContent(html: string): string {
  const tagCandidates = ["main", "article"];
  for (const tag of tagCandidates) {
    const block = extractTagBlock(html, tag);
    if (block && block.length > 200) return block;
  }

  const idCandidates = ["main-content", "main_content", "content", "main", "primary"];
  for (const id of idCandidates) {
    const block = extractByIdOrClass(html, "id", id);
    if (block && block.length > 200) return block;
  }

  const classCandidates = [
    "main-content",
    "content",
    "article",
    "post",
    "entry-content",
    "page-content",
    "field--name-body",
  ];
  for (const cls of classCandidates) {
    const block = extractByIdOrClass(html, "class", cls);
    if (block && block.length > 200) return block;
  }

  const body = extractTagBlock(html, "body");
  return body ?? html;
}

function extractBySelector(html: string, selector: string | null): string {
  // If the user supplied a custom selector, honor it first; otherwise fall
  // through to the smart main-content finder.
  if (selector) {
    try {
      const byId = extractByIdOrClass(html, "id", selector);
      if (byId) return stripHtmlTags(byId);
      const byClass = extractByIdOrClass(html, "class", selector);
      if (byClass) return stripHtmlTags(byClass);
    } catch {
      // fall through
    }
  }
  return stripHtmlTags(findMainContent(html));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SOURCE_SELECT =
    "id, organization_id, source_id, is_custom, custom_url, custom_name, custom_selector, check_frequency, last_checked_at, consecutive_errors, policy_sources(url, name)";

  try {
    const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const isCronCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // User mode: verify the JWT and that the user belongs to the target org.
    let authenticatedOrgId: string | null = null;
    if (!isCronCall) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { data: profile, error: profileError } = await userClient
        .from("profiles")
        .select("organization_id")
        .eq("user_id", userData.user.id)
        .single();
      if (profileError || !profile?.organization_id) {
        return res.status(403).json({ error: "No organization found." });
      }
      authenticatedOrgId = profile.organization_id;

      // Rate limit manual checks: 30/hour per org.
      const rl = await checkRateLimit(authenticatedOrgId, "monitor-sources", 30, 3600);
      if (!rl.allowed) {
        const rlInfo = rateLimitJson(rl.reset_at);
        return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
      }
    }

    const { org_id: bodyOrgId, source_id: requestSourceId } = (req.body || {}) as {
      org_id?: string;
      source_id?: string;
    };

    // In user mode, always scope to the authenticated org (ignore any spoofed org_id in body).
    const requestOrgId = isCronCall ? bodyOrgId : authenticatedOrgId;
    const batch_size = Math.min(Math.max(parseInt(String(req.body?.batch_size ?? 20)), 1), 100);

    let sourcesToProcess: any[] = [];

    if (requestSourceId) {
      // Single-source mode (typically the "Check Now" button).
      const query = adminClient
        .from("organization_sources")
        .select(SOURCE_SELECT)
        .eq("id", requestSourceId)
        .eq("status", "active");
      if (requestOrgId) query.eq("organization_id", requestOrgId);
      const { data: source, error } = await query.maybeSingle();

      if (error) throw error;
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      sourcesToProcess = [source];
    } else if (requestOrgId) {
      const { data: sources, error } = await adminClient
        .from("organization_sources")
        .select(SOURCE_SELECT)
        .eq("organization_id", requestOrgId)
        .eq("status", "active")
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(batch_size);

      if (error) throw error;
      sourcesToProcess = sources ?? [];
    } else {
      const { data: subscriptions } = await adminClient
        .from("subscriptions")
        .select("organization_id")
        .in("status", ["active", "trialing"]);

      const orgIds = subscriptions?.map((s: any) => s.organization_id) ?? [];

      if (orgIds.length === 0) {
        return res.status(200).json({ processed: 0, changes_detected: 0, message: "No active subscriptions" });
      }

      const { data: sources, error } = await adminClient
        .from("organization_sources")
        .select(SOURCE_SELECT)
        .in("organization_id", orgIds)
        .eq("status", "active")
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(batch_size);

      if (error) throw error;
      sourcesToProcess = sources ?? [];
    }

    let processedCount = 0;
    let changesDetected = 0;
    const errors: any[] = [];

    for (const source of sourcesToProcess) {
      try {
        const sourceOrgId = source.organization_id;
        const url = source.is_custom ? source.custom_url : source.policy_sources?.url;

        if (!url) {
          console.warn(`Skipping source ${source.id}: no URL`);
          continue;
        }

        if (!validateUrl(url)) {
          console.warn(`Skipping source ${source.id}: invalid or private URL`);
          errors.push({ source_id: source.id, error: "Invalid or private URL blocked" });
          continue;
        }

        let html = "";
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const response = await fetch(url, {
            headers: {
              "User-Agent": "RuleShift-Monitor/1.0",
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          html = await response.text();
        } catch (fetchErr) {
          const errMsg = (fetchErr as Error).message;
          await adminClient
            .from("organization_sources")
            .update({
              last_error: errMsg,
              consecutive_errors: (source.consecutive_errors ?? 0) + 1,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", source.id);

          errors.push({ source_id: source.id, error: errMsg });
          continue;
        }

        const content = extractBySelector(html, source.custom_selector || null);
        const contentHash = sha256(content);

        const { data: previousSnapshot } = await adminClient
          .from("page_snapshots")
          .select("content_hash, text_content")
          .eq("org_source_id", source.id)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const previousHash = previousSnapshot?.content_hash;
        const previousContent = (previousSnapshot?.text_content as string | null) ?? null;
        const contentChanged = !previousHash || previousHash !== contentHash;

        const { error: snapshotErr } = await adminClient.from("page_snapshots").insert({
          org_source_id: source.id,
          content_hash: contentHash,
          text_content: content.substring(0, 50000),
          fetched_at: new Date().toISOString(),
        });
        if (snapshotErr) {
          console.error("page_snapshots insert failed:", snapshotErr);
        }

        await adminClient
          .from("organization_sources")
          .update({
            last_checked_at: new Date().toISOString(),
            last_error: null,
            consecutive_errors: 0,
          })
          .eq("id", source.id);

        if (contentChanged) {
          changesDetected++;
          await adminClient
            .from("organization_sources")
            .update({
              last_changed_at: new Date().toISOString(),
            })
            .eq("id", source.id);

          const sourceName = source.is_custom
            ? source.custom_name || source.custom_url || "Custom source"
            : source.policy_sources?.name || source.policy_sources?.url || "Unknown source";

          const { data: alert, error: alertErr } = await adminClient
            .from("alerts")
            .insert({
              organization_id: sourceOrgId,
              org_source_id: source.id,
              title: `Change detected: ${sourceName}`,
              source_name: sourceName,
              is_read: false,
            })
            .select("id")
            .single();

          if (alertErr) {
            console.error("alerts insert failed:", alertErr);
          }

          if (!alertErr && alert?.id) {
            // Call the brief generator in-process. We used to POST to
            // /api/generate-brief here, but Vercel's internal fetch fan-out
            // dropped req.body fields intermittently, leaving alerts with no
            // brief_id. Calling the shared core directly is faster and more
            // reliable. In single-source (user "Check Now") mode we await it
            // so the toast can confirm the brief is ready; in cron/batch mode
            // we let it run sequentially per source.
            try {
              await generateBriefForAlert({
                adminClient,
                alertId: alert.id,
                organizationId: sourceOrgId,
                content: content.substring(0, 20000),
                previousContent: previousContent ?? undefined,
                sourceNameFallback: sourceName,
              });
            } catch (briefErr) {
              const msg = (briefErr as Error).message ?? String(briefErr);
              console.error(
                "[monitor-sources] generateBriefForAlert failed:",
                msg
              );
              // Persist the error onto the source row so it survives Vercel
              // log truncation and is visible to the user on the Sources page.
              await adminClient
                .from("organization_sources")
                .update({ last_error: `brief: ${msg}`.substring(0, 500) })
                .eq("id", source.id);
              errors.push({
                source_id: source.id,
                error: `brief generation failed: ${msg}`,
              });
            }
          }

          await adminClient.from("activity_events").insert({
            organization_id: sourceOrgId,
            event_type: "source_changed",
            description: `Content change detected: ${sourceName}`,
          });
        }

        processedCount++;
      } catch (itemErr) {
        console.error(`Error processing source ${source.id}:`, itemErr);
        errors.push({
          source_id: source.id,
          error: (itemErr as Error).message,
        });
      }
    }

    return res.status(200).json({
      processed: processedCount,
      changes_detected: changesDetected,
      total: sourcesToProcess.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("monitor-sources error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
