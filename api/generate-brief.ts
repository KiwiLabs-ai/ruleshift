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

    const { alert_id, organization_id: bodyOrgId, content, source_name } = parsedBody;

    if (!alert_id || !content) {
      return res.status(400).json({ error: "alert_id and content are required" });
    }

    // Cron callers (skipRateLimit) may pass org_id in the body; user callers
    // must use their own org. If neither is present on a cron call, fall back
    // to the alert row itself so we never 403 on a valid alert_id.
    let targetOrgId: string | null = skipRateLimit ? (bodyOrgId || orgId) : orgId;
    if (!targetOrgId && skipRateLimit) {
      const { data: alertRow } = await adminClient
        .from("alerts")
        .select("organization_id")
        .eq("id", alert_id)
        .maybeSingle();
      targetOrgId = alertRow?.organization_id ?? null;
    }
    if (!targetOrgId) {
      console.error("generate-brief: no org context", {
        skipRateLimit,
        hasBodyOrgId: !!bodyOrgId,
        bodyKeys: Object.keys(parsedBody ?? {}),
      });
      return res.status(403).json({ error: "No organization context." });
    }

    try {
      const result = await generateBriefForAlert({
        adminClient,
        alertId: alert_id,
        organizationId: targetOrgId,
        content,
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
