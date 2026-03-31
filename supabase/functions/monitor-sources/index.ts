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

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBySelector(html: string, selector: string): string {
  // Simple approach: look for id or class matching the selector
  const cleanSel = selector.replace(/^[#.]/, "");
  const patterns = [
    new RegExp(`id=["']${cleanSel}["'][^>]*>([\\s\\S]*?)(?=<\\/div>|<\\/section>|<\\/article>|<\\/main>)`, "i"),
    new RegExp(`class=["'][^"']*${cleanSel}[^"']*["'][^>]*>([\\s\\S]*?)(?=<\\/div>|<\\/section>|<\\/article>|<\\/main>)`, "i"),
  ];
  for (const pat of patterns) {
    const match = html.match(pat);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return stripHtml(html);
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startMs = Date.now();

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const batchSize: number = body.batch_size ?? 20;
    const filterOrgId: string | undefined = body.org_id;
    const filterSourceId: string | undefined = body.source_id;

    // Rate limit: 10 per org per hour — skip if no org_id (cron batch)
    if (filterOrgId) {
      const rl = await checkRateLimit(filterOrgId, "monitor-sources", 10, 3600);
      if (!rl.allowed) return rateLimitResponse(rl.reset_at, corsHeaders);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Query active sources with active/trialing subscriptions
    let query = admin
      .from("organization_sources")
      .select(`
        id,
        organization_id,
        source_id,
        is_custom,
        custom_url,
        custom_name,
        custom_selector,
        consecutive_errors,
        organizations!inner ( id, name ),
        subscriptions:organizations!inner ( subscriptions!inner ( status ) ),
        policy_sources ( name, url )
      `)
      .eq("status", "active")
      .in("organizations.subscriptions.status", ["active", "trialing"])
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (filterOrgId) query = query.eq("organization_id", filterOrgId);
    if (filterSourceId) query = query.eq("id", filterSourceId);

    const { data: sources, error: queryErr } = await query;

    if (queryErr) {
      // Fallback: simpler query without nested subscription filter
      console.log("[MONITOR] Complex query failed, using fallback:", queryErr.message);
    }

    // Fallback: fetch sources then filter by subscription
    let sourcesToProcess = sources ?? [];

    if (!sources || queryErr) {
      let fallbackQ = admin
        .from("organization_sources")
        .select(`
          id,
          organization_id,
          source_id,
          is_custom,
          custom_url,
          custom_name,
          custom_selector,
          consecutive_errors,
          policy_sources ( name, url )
        `)
        .eq("status", "active")
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(batchSize * 2);

      if (filterOrgId) fallbackQ = fallbackQ.eq("organization_id", filterOrgId);
      if (filterSourceId) fallbackQ = fallbackQ.eq("id", filterSourceId);

      const { data: fbSources, error: fbErr } = await fallbackQ;
      if (fbErr) throw fbErr;

      // Filter by active subscription
      const orgIds = [...new Set((fbSources ?? []).map((s: any) => s.organization_id))];
      const { data: subs } = await admin
        .from("subscriptions")
        .select("organization_id, status")
        .in("organization_id", orgIds)
        .in("status", ["active", "trialing"]);

      const activeOrgIds = new Set((subs ?? []).map((s: any) => s.organization_id));
      sourcesToProcess = (fbSources ?? []).filter((s: any) => activeOrgIds.has(s.organization_id)).slice(0, batchSize);
    }

    console.log(`[MONITOR] Processing ${sourcesToProcess.length} sources`);

    let sourcesChecked = 0;
    let changesDetected = 0;
    let errors = 0;

    for (const source of sourcesToProcess) {
      const src = source as any;
      const orgSourceId: string = src.id;
      const orgId: string = src.organization_id;
      const sourceName: string = src.is_custom
        ? (src.custom_name || "Custom source")
        : (src.policy_sources?.name || "Unknown source");
      const sourceUrl: string | null = src.is_custom
        ? src.custom_url
        : src.policy_sources?.url;

      if (!sourceUrl) {
        console.log(`[MONITOR] Skipping ${sourceName}: no URL`);
        continue;
      }

      try {
        console.log(`[MONITOR] Fetching: ${sourceName} (${sourceUrl})`);

        // 2b. Fetch with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(sourceUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "RuleShift/1.0 Monitor" },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // 2c. Extract text
        const textContent = src.custom_selector
          ? extractBySelector(html, src.custom_selector)
          : stripHtml(html);

        // 2d. Compute hash
        const contentHash = await sha256(textContent);

        // 2e. Get most recent snapshot
        const { data: prevSnapshot } = await admin
          .from("page_snapshots")
          .select("id, content_hash")
          .eq("org_source_id", orgSourceId)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!prevSnapshot) {
          // 2f. First baseline
          console.log(`[MONITOR] First snapshot for ${sourceName}`);
          await admin.from("page_snapshots").insert({
            org_source_id: orgSourceId,
            content_hash: contentHash,
            text_content: textContent,
          });
          await admin
            .from("organization_sources")
            .update({ last_checked_at: new Date().toISOString(), consecutive_errors: 0, last_error: null })
            .eq("id", orgSourceId);
        } else if (prevSnapshot.content_hash === contentHash) {
          // 2g. No change
          console.log(`[MONITOR] No change for ${sourceName}`);
          await admin
            .from("organization_sources")
            .update({ last_checked_at: new Date().toISOString() })
            .eq("id", orgSourceId);
        } else {
          // 2h. Change detected!
          console.log(`[MONITOR] Change detected for ${sourceName}`);
          changesDetected++;

          await admin.from("page_snapshots").insert({
            org_source_id: orgSourceId,
            content_hash: contentHash,
            text_content: textContent,
          });

          const { data: alertRow } = await admin.from("alerts").insert({
            organization_id: orgId,
            title: `Policy change detected: ${sourceName}`,
            source_name: sourceName,
            severity: "informational",
            org_source_id: orgSourceId,
          }).select("id").single();

          await admin
            .from("organization_sources")
            .update({
              last_checked_at: new Date().toISOString(),
              last_changed_at: new Date().toISOString(),
              consecutive_errors: 0,
              last_error: null,
            })
            .eq("id", orgSourceId);

          await admin.from("activity_events").insert({
            organization_id: orgId,
            event_type: "change_detected",
            description: `Change detected in ${sourceName}`,
          });

          // Audit log
          await admin.from("audit_log").insert({
            organization_id: orgId,
            user_id: null,
            action: "change_detected",
            user_email: "system",
            resource_type: "source",
            resource_name: sourceName,
            details: `Policy change detected and alert created`,
          }).then(() => {});

          // Trigger brief generation asynchronously (fire-and-forget)
          if (alertRow?.id) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            fetch(`${supabaseUrl}/functions/v1/generate-brief`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ alert_id: alertRow.id, org_source_id: orgSourceId }),
            }).catch((e) => console.log(`[MONITOR] Brief generation trigger failed: ${e.message}`));
          }
        }

        sourcesChecked++;
      } catch (fetchErr: any) {
        errors++;
        const errMsg = fetchErr?.message || String(fetchErr);
        console.log(`[MONITOR] Error fetching ${sourceName}: ${errMsg}`);

        const newConsecutive = (src.consecutive_errors ?? 0) + 1;
        const updatePayload: any = {
          last_checked_at: new Date().toISOString(),
          last_error: errMsg,
          consecutive_errors: newConsecutive,
        };
        if (newConsecutive >= 5) {
          updatePayload.status = "error";
          console.log(`[MONITOR] ${sourceName} marked as error after ${newConsecutive} consecutive failures`);
        }
        await admin
          .from("organization_sources")
          .update(updatePayload)
          .eq("id", orgSourceId);
      }
    }

    const durationMs = Date.now() - startMs;
    console.log(`[MONITOR] Done: checked=${sourcesChecked}, changes=${changesDetected}, errors=${errors}, duration=${durationMs}ms`);

    return json({
      sources_checked: sourcesChecked,
      changes_detected: changesDetected,
      errors,
      duration_ms: durationMs,
    });
  } catch (err: any) {
    console.error("[MONITOR] Fatal error:", err);
    return json({ error: err.message }, 500);
  }
});
