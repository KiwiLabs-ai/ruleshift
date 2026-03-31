import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  important: "#ca8a04",
  informational: "#2563eb",
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  important: "⚠️",
  informational: "ℹ️",
};

function isHourMatch(prefTime: string | null, currentHour: number): boolean {
  if (!prefTime) return currentHour === 9; // default 09:00
  const prefHour = parseInt(prefTime.split(":")[0], 10);
  if (isNaN(prefHour)) return currentHour === 9;
  return Math.abs(currentHour - prefHour) <= 1 || Math.abs(currentHour - prefHour) === 23;
}

function buildDigestHtml(
  items: Array<{ title: string; summary: string | null; severity: string; source_name: string; created_at: string; brief_id: string }>,
  dashboardUrl: string,
): string {
  const rows = items
    .map((item) => {
      const color = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.informational;
      const emoji = SEVERITY_EMOJI[item.severity] || "ℹ️";
      const label = item.severity.charAt(0).toUpperCase() + item.severity.slice(1);
      const date = new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;">${date}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#3f3f46;">${item.source_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#18181b;font-weight:500;">${item.title}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;text-align:center;">
          <span style="display:inline-block;background:${color}15;color:${color};border:1px solid ${color}40;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;">${emoji} ${label}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e293b,#0f766e);padding:24px 32px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">RuleShift Digest</h1>
          <p style="margin:6px 0 0;font-size:14px;color:#94a3b8;">${items.length} update${items.length !== 1 ? "s" : ""} since your last digest</p>
        </td></tr>
        <!-- Table -->
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Date</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Source</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Title</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Severity</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:0 24px 28px;" align="center">
          <a href="${dashboardUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View All in Dashboard</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">RuleShift — Regulatory monitoring for SMBs</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[DIGEST] RESEND_API_KEY not configured");
      return json({ error: "Email service not configured" }, 500);
    }

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = DAY_NAMES[now.getUTCDay()];

    console.log(`[DIGEST] Running at UTC hour=${currentHour}, day=${currentDay}`);

    // 1. Fetch all daily/weekly prefs
    const { data: prefs, error: prefsErr } = await admin
      .from("notification_preferences")
      .select("*")
      .in("digest_frequency", ["daily", "weekly"]);

    if (prefsErr) {
      console.error("[DIGEST] Prefs query error:", prefsErr.message);
      return json({ error: "Failed to fetch preferences" }, 500);
    }

    if (!prefs || prefs.length === 0) {
      console.log("[DIGEST] No digest subscribers found");
      return json({ digests_sent: 0, total_briefs_included: 0 });
    }

    // 2. Filter eligible users
    const eligible = prefs.filter((p: any) => {
      if (p.digest_frequency === "daily") {
        return isHourMatch(p.preferred_time, currentHour);
      }
      if (p.digest_frequency === "weekly") {
        const prefDay = (p.preferred_day || "monday").toLowerCase();
        return prefDay === currentDay && isHourMatch(p.preferred_time, currentHour);
      }
      return false;
    });

    console.log(`[DIGEST] ${eligible.length} eligible users out of ${prefs.length} subscribers`);

    if (eligible.length === 0) {
      return json({ digests_sent: 0, total_briefs_included: 0 });
    }

    // 3. Get user emails
    const { data: usersData } = await admin.auth.admin.listUsers();
    const emailMap = new Map(
      (usersData?.users ?? []).map((u: any) => [u.id, u.email]),
    );

    const dashboardUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") + "/alerts" || "";

    let digestsSent = 0;
    let totalBriefsIncluded = 0;

    for (const pref of eligible) {
      const userId: string = (pref as any).user_id;
      const email = emailMap.get(userId);

      if (!email) {
        console.log(`[DIGEST] No email found for user ${userId}, skipping`);
        continue;
      }

      // 4. Query unsent digest items
      const { data: queueItems, error: qErr } = await admin
        .from("digest_queue")
        .select("id, brief_id, queued_at, briefs(id, title, summary, source_name, created_at, alert_id, alerts(severity))")
        .eq("user_id", userId)
        .is("sent_at", null)
        .order("queued_at", { ascending: true });

      if (qErr) {
        console.error(`[DIGEST] Queue query error for ${userId}:`, qErr.message);
        continue;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log(`[DIGEST] No unsent items for user ${userId}`);
        continue;
      }

      // 5. Build email data
      const items = queueItems.map((qi: any) => {
        const brief = qi.briefs;
        const alertData = Array.isArray(brief?.alerts) ? brief.alerts[0] : brief?.alerts;
        return {
          title: brief?.title || "Untitled",
          summary: brief?.summary || null,
          severity: (alertData as any)?.severity || "informational",
          source_name: brief?.source_name || "Unknown",
          created_at: brief?.created_at || qi.queued_at,
          brief_id: qi.brief_id,
        };
      });

      const html = buildDigestHtml(items, dashboardUrl);

      // 6. Send via Resend
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "RuleShift <digest@ruleshift.app>",
            to: [email],
            subject: `Your RuleShift Digest — ${items.length} update${items.length !== 1 ? "s" : ""}`,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[DIGEST] Resend error for ${email}: ${res.status} ${errText}`);
          continue;
        }

        // 7. Mark as sent
        const queueIds = queueItems.map((qi: any) => qi.id);
        await admin
          .from("digest_queue")
          .update({ sent_at: new Date().toISOString() })
          .in("id", queueIds);

        digestsSent++;
        totalBriefsIncluded += items.length;
        console.log(`[DIGEST] Sent digest to ${email} with ${items.length} items`);
      } catch (e: any) {
        console.error(`[DIGEST] Send error for ${email}: ${e.message}`);
      }
    }

    console.log(`[DIGEST] Done: digests_sent=${digestsSent}, total_briefs=${totalBriefsIncluded}`);
    return json({ digests_sent: digestsSent, total_briefs_included: totalBriefsIncluded });
  } catch (err: any) {
    console.error("[DIGEST] Fatal error:", err);
    return json({ error: err.message }, 500);
  }
});
