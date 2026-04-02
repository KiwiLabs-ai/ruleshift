import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function extractBySelector(html: string, selector: string | null): string {
  if (!selector) return stripHtmlTags(html);

  try {
    const startIndex = html.indexOf(`id="${selector}"`);
    if (startIndex === -1) {
      const classIndex = html.indexOf(`class="${selector}"`);
      if (classIndex === -1) {
        return stripHtmlTags(html);
      }
      const contentStart = html.indexOf(">", classIndex);
      const contentEnd = html.indexOf("</", contentStart);
      return stripHtmlTags(html.substring(contentStart + 1, contentEnd));
    }
    const contentStart = html.indexOf(">", startIndex);
    const contentEnd = html.indexOf("</", contentStart);
    return stripHtmlTags(html.substring(contentStart + 1, contentEnd));
  } catch {
    return stripHtmlTags(html);
  }
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
      const rl = await checkRateLimit(orgId, "monitor-sources", 10, 3600);
      if (!rl.allowed) {
        const rlInfo = rateLimitJson(rl.reset_at);
        return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
      }
    }

    const { org_id: requestOrgId, batch_size = 20 } = req.body || {};

    let sourcesToProcess = [];

    if (skipRateLimit && requestOrgId) {
      const { data: sources, error } = await adminClient
        .from("organization_sources")
        .select("id, organization_id, source_id, is_custom, custom_url, custom_selector, check_frequency, last_checked_at, policy_sources(url)")
        .eq("organization_id", requestOrgId)
        .eq("status", "active")
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(batch_size);

      if (error) throw error;
      sourcesToProcess = sources ?? [];
    } else if (orgId) {
      const { data: sources, error } = await adminClient
        .from("organization_sources")
        .select("id, organization_id, source_id, is_custom, custom_url, custom_selector, check_frequency, last_checked_at, policy_sources(url)")
        .eq("organization_id", orgId)
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
        return res.status(200).json({ processed: 0, message: "No active subscriptions" });
      }

      const { data: sources, error } = await adminClient
        .from("organization_sources")
        .select("id, organization_id, source_id, is_custom, custom_url, custom_selector, check_frequency, last_checked_at, policy_sources(url)")
        .in("organization_id", orgIds)
        .eq("status", "active")
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(batch_size);

      if (error) throw error;
      sourcesToProcess = sources ?? [];
    }

    let processedCount = 0;
    const errors: any[] = [];

    for (const source of sourcesToProcess) {
      try {
        const sourceOrgId = source.organization_id;
        const url = source.is_custom ? source.custom_url : source.policy_sources?.url;

        if (!url) {
          console.warn(`Skipping source ${source.id}: no URL`);
          continue;
        }

        let html = "";
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "RuleShift-Monitor/1.0",
            },
            timeout: 30000,
          });

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

        const { data: lastHash } = await adminClient
          .from("source_content_history")
          .select("content_hash")
          .eq("organization_source_id", source.id)
          .order("checked_at", { ascending: false })
          .limit(1)
          .single();

        const previousHash = lastHash?.content_hash;
        const contentChanged = !previousHash || previousHash !== contentHash;

        await adminClient.from("source_content_history").insert({
          organization_source_id: source.id,
          content_hash: contentHash,
          content_preview: content.substring(0, 500),
          checked_at: new Date().toISOString(),
        });

        await adminClient
          .from("organization_sources")
          .update({
            last_checked_at: new Date().toISOString(),
            last_error: null,
            consecutive_errors: 0,
          })
          .eq("id", source.id);

        if (contentChanged) {
          await adminClient
            .from("organization_sources")
            .update({
              last_changed_at: new Date().toISOString(),
            })
            .eq("id", source.id);

          const sourceName = source.is_custom
            ? `Custom: ${source.custom_url}`
            : source.policy_sources?.url || "Unknown";

          const { data: alert, error: alertErr } = await adminClient
            .from("alerts")
            .insert({
              organization_id: sourceOrgId,
              organization_source_id: source.id,
              status: "new",
              title: `Change detected: ${sourceName}`,
              description: `Content changes detected at ${sourceName}`,
              content_preview: content.substring(0, 500),
              content_hash: contentHash,
            })
            .select("id")
            .single();

          if (!alertErr && alert?.id) {
            fetch(`${process.env.APP_URL}/api/generate-brief`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
              body: JSON.stringify({
                alert_id: alert.id,
                organization_id: sourceOrgId,
                content: content.substring(0, 2000),
                source_name: sourceName,
              }),
            }).catch((err) => {
              console.error("Failed to trigger brief generation:", err);
            });
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
      total: sourcesToProcess.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("monitor-sources error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
