import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

/** Reminder windows: how many days before a deadline to send a reminder. */
const REMINDER_DAYS = [7, 3, 1];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urgencyColor(daysUntil: number): string {
  if (daysUntil <= 1) return "#dc2626";
  if (daysUntil <= 3) return "#ca8a04";
  return "#2563eb";
}

function buildReminderEmailHtml(
  deadlines: Array<{ title: string; source_name: string; deadline_date: string; id: string }>,
  daysUntil: number,
  appUrl: string
): string {
  const color = urgencyColor(daysUntil);
  const label =
    daysUntil === 1 ? "Tomorrow" : daysUntil === 0 ? "Today" : `In ${daysUntil} days`;

  const rows = deadlines
    .map((d) => {
      const dateStr = new Date(d.deadline_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-size: 14px; color: #111827;">${escapeHtml(d.title)}</td>
          <td style="padding: 12px; font-size: 13px; color: #6b7280;">${escapeHtml(d.source_name)}</td>
          <td style="padding: 12px; font-size: 13px; color: #6b7280;">${dateStr}</td>
          <td style="padding: 12px;">
            <a href="${appUrl}/briefs/${d.id}" style="color: #3b82f6; text-decoration: none; font-size: 13px;">View Brief</a>
          </td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RuleShift Deadline Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%); color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Deadline Reminder</h1>
    </div>
    <div style="padding: 24px;">
      <div style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 600; margin-bottom: 16px;">
        ${label}
      </div>
      <p style="font-size: 14px; color: #4b5563; margin: 0 0 16px;">
        You have ${deadlines.length} regulatory deadline${deadlines.length > 1 ? "s" : ""} approaching:
      </p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Title</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Source</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Date</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}/deadlines" style="display: inline-block; background-color: #1a1f3a; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">View All Deadlines</a>
      </div>
    </div>
    <div style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">RuleShift helps you stay on top of regulatory changes.<br><a href="${appUrl}" style="color: #3b82f6; text-decoration: none;">Visit RuleShift</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron-only endpoint
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const appUrl = process.env.APP_URL || "https://ruleshift.ai";
    let totalSent = 0;

    // For each reminder window, find matching deadlines
    for (const daysAhead of REMINDER_DAYS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Find all briefs with this deadline date, grouped by org
      const { data: briefs, error: briefErr } = await supabaseAdmin
        .from("briefs")
        .select("id, title, source_name, deadline_date, organization_id")
        .eq("deadline_date", targetDateStr);

      if (briefErr) {
        console.error(`[deadline-reminders] query error for ${targetDateStr}:`, briefErr);
        continue;
      }

      if (!briefs || briefs.length === 0) continue;

      // Group by org
      const byOrg = new Map<string, typeof briefs>();
      for (const b of briefs) {
        const existing = byOrg.get(b.organization_id);
        if (existing) {
          existing.push(b);
        } else {
          byOrg.set(b.organization_id, [b]);
        }
      }

      // For each org, find members with email notifications enabled and send
      for (const [orgId, orgBriefs] of byOrg) {
        // Get org members
        const { data: members, error: memberErr } = await supabaseAdmin
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", orgId);

        if (memberErr || !members?.length) continue;

        // Get user emails
        for (const member of members) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
            member.user_id
          );
          const email = userData?.user?.email;
          if (!email) continue;

          // Check notification preferences — skip if email disabled
          const { data: prefs } = await supabaseAdmin
            .from("notification_preferences")
            .select("email_enabled")
            .eq("user_id", member.user_id)
            .eq("organization_id", orgId)
            .maybeSingle();

          if (prefs && prefs.email_enabled === false) continue;

          const html = buildReminderEmailHtml(orgBriefs, daysAhead, appUrl);
          const subject =
            daysAhead === 1
              ? `Deadline tomorrow: ${orgBriefs[0].title}${orgBriefs.length > 1 ? ` (+${orgBriefs.length - 1} more)` : ""}`
              : `${orgBriefs.length} deadline${orgBriefs.length > 1 ? "s" : ""} in ${daysAhead} days`;

          try {
            await resend.emails.send({
              from: "RuleShift Reminders <alerts@ruleshift.app>",
              to: email,
              subject,
              html,
            });
            totalSent++;
          } catch (emailErr) {
            console.error(`[deadline-reminders] email failed for ${email}:`, emailErr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      reminders_sent: totalSent,
      checked_windows: REMINDER_DAYS,
    });
  } catch (err) {
    console.error("[deadline-reminders] error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
