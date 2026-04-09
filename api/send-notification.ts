import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

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

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "https://ruleshift.ai");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function buildEmailHtml(
  brief: any,
  severity: string,
  briefUrl: string
): string {
  const severityColor = SEVERITY_COLOR[severity] || "#2563eb";
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RuleShift Alert</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%);
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .severity-badge {
      display: inline-block;
      background-color: ${severityColor};
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .brief-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .brief-meta {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    .brief-summary {
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f3f4f6;
      border-left: 4px solid ${severityColor};
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      background-color: ${severityColor};
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>RuleShift Alert</h1>
    </div>
    <div class="content">
      <div class="severity-badge">${severityLabel}</div>
      <div class="brief-title">${escapeHtml(brief.title)}</div>
      <div class="brief-meta">Source: ${escapeHtml(brief.source_name)}</div>
      <div class="brief-summary">${escapeHtml(brief.summary)}</div>
      <a href="${briefUrl}" class="button">View Full Brief</a>
    </div>
    <div class="footer">
      <p>
        RuleShift helps you stay on top of regulatory changes.
        <br>
        <a href="${process.env.APP_URL}">Visit RuleShift</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function buildSlackBlocks(
  brief: any,
  severity: string,
  briefUrl: string
): any[] {
  const emoji = SEVERITY_EMOJI[severity] || "ℹ️";
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${severityLabel} Alert`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Title*\n${brief.title}`,
        },
        {
          type: "mrkdwn",
          text: `*Source*\n${brief.source_name}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${brief.summary}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Full Brief",
            emoji: true,
          },
          url: briefUrl,
          style: "primary",
        },
      ],
    },
  ];
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const isCron = token === process.env.CRON_SECRET;

    const { brief_id, organization_id } = req.body;

    if (!brief_id || !organization_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify org membership for non-cron callers
    if (!isCron) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", userData.user.id)
        .single();

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }
    }

    // Fetch brief and alert severity
    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("*, alerts(severity)")
      .eq("id", brief_id)
      .single();

    if (briefError || !brief) {
      return res.status(404).json({ error: "Brief not found" });
    }

    // briefs.alert_id is a scalar FK so the `alerts(severity)` join returns
    // an object, not an array. The old `?.[0]` was always undefined and
    // fell back to "informational", defeating severity thresholding for
    // every realtime alert + every digest_queue row inserted below.
    const severity = brief.alerts?.severity || "informational";

    // Fetch accepted organization members
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("user_id, notification_preferences")
      .eq("organization_id", organization_id)
      .eq("status", "accepted");

    if (membersError) {
      return res.status(500).json({ error: "Failed to fetch members" });
    }

    const briefUrl = `${process.env.APP_URL}/briefs/${brief_id}`;
    const emailHtml = buildEmailHtml(brief, severity, briefUrl);
    const slackBlocks = buildSlackBlocks(brief, severity, briefUrl);

    const severityOrder = SEVERITY_ORDER[severity];

    // Process each member
    for (const member of members || []) {
      const prefs = member.notification_preferences || {};
      const severityThreshold = SEVERITY_ORDER[prefs.severity_threshold || "informational"] || 0;
      const digestFrequency = prefs.digest_frequency || "realtime";

      // Check if severity meets threshold
      if (severityOrder < severityThreshold) {
        continue;
      }

      // Fetch user email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("id", member.user_id)
        .single();

      if (userError || !user) {
        continue;
      }

      if (digestFrequency === "realtime") {
        // Send email via Resend
        if (prefs.email_enabled) {
          await resend.emails.send({
            from: "RuleShift <alerts@ruleshift.app>",
            to: user.email,
            subject: `RuleShift Alert: ${brief.title}`,
            html: emailHtml,
          });
        }

        // Send Slack webhook if configured
        if (prefs.slack_webhook_url) {
          await fetch(prefs.slack_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blocks: slackBlocks }),
          });
        }
      } else if (digestFrequency === "daily" || digestFrequency === "weekly") {
        // Queue to digest_queue
        await supabaseAdmin
          .from("digest_queue")
          .insert({
            user_id: member.user_id,
            brief_id: brief_id,
            organization_id: organization_id,
            severity: severity,
            created_at: new Date().toISOString(),
            sent: false,
          });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
