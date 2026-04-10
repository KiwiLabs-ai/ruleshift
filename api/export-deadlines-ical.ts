import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitJson } from "./_shared/rate-limit.js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://ruleshift.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

/** Escape text for iCalendar format (fold long lines, escape special chars). */
function icalEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Format a DATE value for iCalendar (YYYYMMDD). */
function icalDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function buildIcal(
  deadlines: Array<{
    id: string;
    title: string;
    source_name: string;
    deadline_date: string;
    summary: string | null;
  }>,
  appUrl: string
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const events = deadlines.map((d) => {
    const dtStart = icalDate(d.deadline_date);
    // All-day event: DTEND is the day after DTSTART
    const endDate = new Date(d.deadline_date + "T00:00:00Z");
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const dtEnd = endDate.toISOString().split("T")[0].replace(/-/g, "");

    const description = d.summary
      ? icalEscape(d.summary)
      : icalEscape(`Regulatory deadline from ${d.source_name}`);

    const url = `${appUrl}/briefs/${d.id}`;

    return [
      "BEGIN:VEVENT",
      `UID:deadline-${d.id}@ruleshift.ai`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${icalEscape(d.title)}`,
      `DESCRIPTION:${description}`,
      `URL:${url}`,
      `CATEGORIES:Regulatory Deadline`,
      // 1-day-before reminder
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Deadline tomorrow: ${icalEscape(d.title)}`,
      "END:VALARM",
      // 7-day-before reminder
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      `DESCRIPTION:Deadline in 7 days: ${icalEscape(d.title)}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RuleShift//Regulatory Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RuleShift Deadlines",
    "X-WR-CALDESC:Regulatory compliance deadlines from RuleShift",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const token = authHeader.substring(7);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Look up org
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.organization_id) {
      return res.status(403).json({ error: "No organization found" });
    }

    const orgId = profile.organization_id;

    // Rate limit: 10/hour per org
    const rl = await checkRateLimit(orgId, "export-deadlines-ical", 10, 3600);
    if (!rl.allowed) {
      const rlInfo = rateLimitJson(rl.reset_at);
      return res.setHeader("Retry-After", rlInfo.retryAfter).status(429).json(rlInfo.body);
    }

    // Fetch all deadlines (upcoming only — past deadlines aren't useful in a calendar export)
    const today = new Date().toISOString().split("T")[0];
    const { data: deadlines, error: fetchErr } = await supabaseAdmin
      .from("briefs")
      .select("id, title, source_name, deadline_date, summary")
      .eq("organization_id", orgId)
      .not("deadline_date", "is", null)
      .gte("deadline_date", today)
      .order("deadline_date", { ascending: true });

    if (fetchErr) throw fetchErr;

    const appUrl = process.env.APP_URL || "https://ruleshift.ai";
    const ical = buildIcal(deadlines ?? [], appUrl);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=ruleshift-deadlines.ics");
    return res.status(200).send(ical);
  } catch (err) {
    console.error("export-deadlines-ical error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
