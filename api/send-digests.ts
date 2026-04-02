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

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  important: "#ca8a04",
  informational: "#2563eb",
};

function isHourMatch(preferredTime: string | null, currentHour: number): boolean {
  if (!preferredTime) {
    // Default to 9 AM if no preferred time
    return Math.abs(currentHour - 9) <= 1;
  }

  const [hour] = preferredTime.split(":").map(Number);
  return Math.abs(currentHour - hour) <= 1;
}

function isDayMatch(preferredDays: string[] | null, currentDay: string): boolean {
  if (!preferredDays || preferredDays.length === 0) {
    return true; // No preference means send on any day
  }
  return preferredDays.includes(currentDay);
}

function buildDigestEmailHtml(
  items: any[],
  organizationName: string,
  dashboardUrl: string
): string {
  const rowsHtml = items
    .map((item) => {
      const severity = item.severity || "informational";
      const color = SEVERITY_COLOR[severity] || "#2563eb";
      const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
      const date = new Date(item.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-size: 13px; color: #6b7280;">${escapeHtml(date)}</td>
          <td style="padding: 12px; font-size: 13px; color: #374151;">${escapeHtml(item.source_name || "Unknown")}</td>
          <td style="padding: 12px; font-size: 13px; color: #1f2937; font-weight: 500;">${escapeHtml(item.title || "")}</td>
          <td style="padding: 12px; text-align: center;">
            <span style="display: inline-block; background-color: ${color}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
              ${severityLabel}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your RuleShift Digest</title>
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
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .cta-button {
      display: inline-block;
      background-color: #1a1f3a;
      color: #ffffff;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
    }
    .cta-button:hover {
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
      <h1>Your RuleShift Digest</h1>
      <p>${items.length} ${items.length === 1 ? "update" : "updates"}</p>
    </div>
    <div class="content">
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
        Here are the regulatory updates from ${escapeHtml(organizationName)} this period.
      </p>
      <h2 class="section-title">Updates</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Title</th>
            <th style="text-align: center;">Severity</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="text-align: center;">
        <a href="${dashboardUrl}" class="cta-button">View All Updates</a>
      </div>
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
  // CRON_SECRET verification
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get current UTC time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDayIndex = now.getUTCDay();
    const currentDay = DAY_NAMES[currentDayIndex];

    // Fetch all users with daily/weekly digest preferences
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select(
        `
        id,
        email,
        organization_members(
          organization_id,
          notification_preferences,
          organizations(name)
        )
      `
      );

    if (usersError) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    let digestsSent = 0;

    for (const user of users || []) {
      for (const membership of user.organization_members || []) {
        const prefs = membership.notification_preferences || {};
        const digestFrequency = prefs.digest_frequency;

        // Skip if not a digest preference
        if (digestFrequency !== "daily" && digestFrequency !== "weekly") {
          continue;
        }

        // Check if this is the right time to send
        const hourMatch = isHourMatch(prefs.preferred_time, currentHour);
        const dayMatch =
          digestFrequency === "daily" ||
          isDayMatch(prefs.preferred_days, currentDay);

        if (!hourMatch || !dayMatch) {
          continue;
        }

        // Fetch unsent digest items
        const { data: queueItems, error: queueError } = await supabaseAdmin
          .from("digest_queue")
          .select("*, briefs(title, source_name), alerts(severity)")
          .eq("user_id", user.id)
          .eq("organization_id", membership.organization_id)
          .eq("sent", false)
          .order("created_at", { ascending: false });

        if (queueError || !queueItems || queueItems.length === 0) {
          continue;
        }

        // Map queue items to briefs with severity
        const items = queueItems.map((item: any) => ({
          created_at: item.created_at,
          source_name: item.briefs?.source_name,
          title: item.briefs?.title,
          severity: item.severity,
        }));

        // Build and send email
        const dashboardUrl = `${process.env.APP_URL}/alerts`;
        const emailHtml = buildDigestEmailHtml(
          items,
          (membership as any).organizations?.name || "Your Organization",
          dashboardUrl
        );

        const subject = `Your RuleShift Digest — ${items.length} ${items.length === 1 ? "update" : "updates"}`;

        const result = await resend.emails.send({
          from: "RuleShift <digest@ruleshift.app>",
          to: user.email,
          subject: subject,
          html: emailHtml,
        });

        if (result.error) {
          console.error(`Failed to send digest to ${user.email}:`, result.error);
          continue;
        }

        // Mark items as sent
        const queueIds = queueItems.map((item: any) => item.id);
        await supabaseAdmin
          .from("digest_queue")
          .update({ sent: true })
          .in("id", queueIds);

        digestsSent++;
      }
    }

    return res.status(200).json({
      success: true,
      digestsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error sending digests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
