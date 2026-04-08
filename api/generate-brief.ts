import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";
import { generateBriefForAlert } from "./_shared/brief-core.js";

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

    // Vercel sometimes hands req.body through unparsed when the
    // Content-Type header survives but the body parser didn't run
    // (e.g. internal server-to-server fetch). Parse defensively.
    const rawBody = req.body;
    const parsedBody =
      typeof rawBody === "string"
        ? (() => {
            try {
              return JSON.parse(rawBody);
            } catch {
              return {};
            }
          })()
        : rawBody ?? {};

    const { alert_id, organization_id: bodyOrgId, content: bodyContent, source_name } = parsedBody;

    if (!alert_id) {
      return res.status(400).json({ error: "alert_id is required" });
    }

    // Always look up the alert so we know (a) the org context, (b) the
    // org_source_id we can use to find the latest snapshot, and (c) whether
    // there is already a brief we need to replace when regenerating.
    const { data: alertRow, error: alertLookupErr } = await adminClient
      .from("alerts")
      .select("id, organization_id, org_source_id, brief_id")
      .eq("id", alert_id)
      .maybeSingle();

    if (alertLookupErr || !alertRow) {
      return res.status(404).json({ error: "Alert not found" });
    }

    // Enforce org scoping: user callers can only regenerate briefs for alerts
    // in their own org. Cron/internal callers bypass this check.
    if (!skipRateLimit && orgId && alertRow.organization_id !== orgId) {
      return res.status(403).json({ error: "Alert does not belong to your organization" });
    }

    const targetOrgId: string | null =
      skipRateLimit ? (bodyOrgId || alertRow.organization_id) : (orgId ?? alertRow.organization_id);
    if (!targetOrgId) {
      console.error("generate-brief: no org context", {
        skipRateLimit,
        hasBodyOrgId: !!bodyOrgId,
        bodyKeys: Object.keys(parsedBody ?? {}),
      });
      return res.status(403).json({ error: "No organization context." });
    }

    // If the caller didn't pass `content`, fetch the latest page snapshot for
    // this alert's source. This is the path the frontend "Regenerate Brief"
    // button uses — it doesn't have access to the raw scraped text, so it
    // relies on the server to look it up.
    let content: string = bodyContent ?? "";
    let previousContent: string | undefined;
    if (!content) {
      if (!alertRow.org_source_id) {
        return res
          .status(400)
          .json({ error: "Cannot regenerate: alert has no associated source snapshot" });
      }
      const { data: snapshots, error: snapshotErr } = await adminClient
        .from("page_snapshots")
        .select("text_content, fetched_at")
        .eq("org_source_id", alertRow.org_source_id)
        .order("fetched_at", { ascending: false })
        .limit(2);

      if (snapshotErr || !snapshots || snapshots.length === 0) {
        return res
          .status(404)
          .json({ error: "No snapshots found for this source — cannot regenerate" });
      }
      content = (snapshots[0].text_content as string | null) ?? "";
      if (!content) {
        return res
          .status(404)
          .json({ error: "Latest snapshot has no text content" });
      }
      // If there's a prior snapshot we can show the model what changed.
      if (snapshots.length > 1) {
        previousContent = (snapshots[1].text_content as string | null) ?? undefined;
      }
    }

    try {
      const result = await generateBriefForAlert({
        adminClient,
        alertId: alert_id,
        organizationId: targetOrgId,
        content,
        previousContent,
        sourceNameFallback: source_name,
      });
      return res.status(200).json({
        success: true,
        alert_id,
        brief_id: result.briefId,
        brief_length: result.briefLength,
      });
    } catch (briefErr) {
      const message = (briefErr as Error).message ?? "Internal error";
      if (message === "Anthropic API timeout") {
        console.error("generate-brief: Anthropic API timed out");
        return res.status(504).json({ error: "Brief generation timed out. Please try again." });
      }
      throw briefErr;
    }
  } catch (err) {
    console.error("generate-brief error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
