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

const SEVERITY_ORDER: Record<string, number> = {
  informational: 0,
  important: 1,
  critical: 2,
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  important: "⚠️",
  informational: "ℹ️",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  important: "#ca8a04",
  informational: "#2563eb",
};

function meetsSeverityThreshold(briefSeverity: string, threshold: string): boolean {
  if (threshold === "all") return true;
  const briefLevel = SEVERITY_ORDER[briefSeverity] ?? 0;
  const thresholdLevel = SEVERITY_ORDER[threshold] ?? 0;
  return briefLevel >= thresholdLevel;
}

function buildEmailHtml(brief: any, severity: string, briefUrl: string): string {
  const color = SEVERITY_COLOR[severity] || SEVERITY_COLOR.informational;
  const emoji = SEVERITY_EMOJI[severity] || "ℹ️";
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="padding:24px 32px 16px;">
          <span style="display:inline-block;background:${color}15;color:${color};border:1px solid ${color}40;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;">${emoji} ${label}</span>
        </td></tr>
        <tr><td style="padding:0 32px 12px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;line-height:1.4;">${brief.title}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 8px;">
          <p style="margin:0;font-size:13px;color:#71717a;">Source: ${brief.source_name}</p>
        </td></tr>
        ${brief.summary ? `<tr><td style="padding:0 32px 20px;">
          <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">${brief.summary}</p>
        </td></tr>` : ""}
        <tr><td style="padding:0 32px 28px;">
          <a href="${briefUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View Full Brief</a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">RuleShift — Regulatory monitoring for SMBs</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSlackBlocks(brief: any, severity: string, briefUrl: string) {
  const emoji = SEVERITY_EMOJI[severity] || "ℹ️";
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${brief.title}*\n_Source: ${brief.source_name}_`,
        },
      },
      ...(brief.summary
        ? [{ type: "section", text: { type: "mrkdwn", text: brief.summary } }]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Full Brief" },
            url: briefUrl,
            style: "primary",
          },
        ],
      },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brief_id, organization_id } = await req.json();
    if (!brief_id || !organization_id) {
      return json({ error: "brief_id and organization_id are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch brief + linked alert
    const { data: brief, error: briefErr } = await admin
      .from("briefs")
      .select("id, title, summary, source_name, alert_id, alerts(id, severity)")
      .eq("id", brief_id)
      .single();

    if (briefErr || !brief) {
      console.error("[NOTIFY] Brief not found:", briefErr?.message);
      return json({ error: "Brief not found" }, 404);
    }

    const alertData = Array.isArray(brief.alerts) ? brief.alerts[0] : brief.alerts;
    const severity: string = (alertData as any)?.severity ?? "informational";

    // 2. Fetch accepted org members
    const { data: members, error: membersErr } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization_id)
      .not("accepted_at", "is", null)
      .not("user_id", "is", null);

    if (membersErr) {
      console.error("[NOTIFY] Members query error:", membersErr.message);
      return json({ error: "Failed to fetch members" }, 500);
    }

    const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);

    if (userIds.length === 0) {
      console.log("[NOTIFY] No accepted members found");
      return json({ notifications_sent: 0, digest_queued: 0 });
    }

    // 3. Fetch notification preferences for all members
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("*")
      .in("user_id", userIds);

    const prefsMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p]));

    // 4. Fetch user emails for email delivery
    const { data: usersData } = await admin.auth.admin.listUsers();
    const emailMap = new Map(
      (usersData?.users ?? []).map((u: any) => [u.id, u.email]),
    );

    const briefUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || ""}/briefs/${brief_id}`;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let notificationsSent = 0;
    let digestQueued = 0;

    for (const userId of userIds) {
      const userPrefs = prefsMap.get(userId);

      // Default preferences if none set
      const emailEnabled = userPrefs?.email_enabled ?? true;
      const slackEnabled = userPrefs?.slack_enabled ?? false;
      const slackWebhookUrl = userPrefs?.slack_webhook_url ?? null;
      const severityThreshold = userPrefs?.severity_threshold ?? "all";
      const digestFrequency = userPrefs?.digest_frequency ?? "realtime";

      // Check severity threshold
      if (!meetsSeverityThreshold(severity, severityThreshold)) {
        console.log(`[NOTIFY] Skipping user ${userId}: severity ${severity} below threshold ${severityThreshold}`);
        continue;
      }

      // Check digest frequency
      if (digestFrequency === "daily" || digestFrequency === "weekly") {
        await admin.from("digest_queue").insert({
          user_id: userId,
          brief_id: brief_id,
          organization_id: organization_id,
        });
        digestQueued++;
        console.log(`[NOTIFY] Queued digest for user ${userId} (${digestFrequency})`);
        continue;
      }

      // Realtime delivery
      // Email
      if (emailEnabled && RESEND_API_KEY) {
        const email = emailMap.get(userId);
        if (email) {
          try {
            const emailHtml = buildEmailHtml(brief, severity, briefUrl);
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "RuleShift <alerts@ruleshift.app>",
                to: [email],
                subject: `${SEVERITY_EMOJI[severity] || ""} ${brief.title}`,
                html: emailHtml,
              }),
            });
            if (res.ok) {
              notificationsSent++;
              console.log(`[NOTIFY] Email sent to ${email}`);
            } else {
              const errText = await res.text();
              console.error(`[NOTIFY] Email failed for ${email}: ${res.status} ${errText}`);
            }
          } catch (e: any) {
            console.error(`[NOTIFY] Email error for ${email}: ${e.message}`);
          }
        }
      } else if (emailEnabled && !RESEND_API_KEY) {
        console.log(`[NOTIFY] Email enabled for user ${userId} but RESEND_API_KEY not configured`);
      }

      // Slack
      if (slackEnabled && slackWebhookUrl) {
        try {
          const slackPayload = buildSlackBlocks(brief, severity, briefUrl);
          const res = await fetch(slackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackPayload),
          });
          if (res.ok) {
            notificationsSent++;
            console.log(`[NOTIFY] Slack notification sent for user ${userId}`);
          } else {
            const errText = await res.text();
            console.error(`[NOTIFY] Slack failed for user ${userId}: ${res.status} ${errText}`);
          }
        } catch (e: any) {
          console.error(`[NOTIFY] Slack error for user ${userId}: ${e.message}`);
        }
      }
    }

    console.log(`[NOTIFY] Done: sent=${notificationsSent}, queued=${digestQueued}`);

    return json({ notifications_sent: notificationsSent, digest_queued: digestQueued });
  } catch (err: any) {
    console.error("[NOTIFY] Fatal error:", err);
    return json({ error: err.message }, 500);
  }
});
