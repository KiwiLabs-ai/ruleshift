import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { rateLimitJson } from "./_shared/rate-limit";
import { RateLimiter } from "./_shared/rate-limit";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rateLimiter = new RateLimiter({
  points: 10, // 10 requests
  duration: 3600, // per hour
});

function escapeCSV(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }

  const str = String(field);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildCSV(auditLogs: any[]): string {
  const headers = ["Date", "User", "Action", "Resource Type", "Resource Name", "Details"];
  const rows = auditLogs.map((log) => [
    formatDate(log.created_at),
    log.user_email || "Unknown",
    log.action || "",
    log.resource_type || "",
    log.resource_name || "",
    log.details || "",
  ]);

  const csvRows = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvRows.join("\n");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get org_id and dates from query params or body
    let org_id: string | undefined;
    let start_date: string | undefined;
    let end_date: string | undefined;

    if (req.method === "GET") {
      org_id = req.query.org_id as string;
      start_date = req.query.start_date as string;
      end_date = req.query.end_date as string;
    } else {
      org_id = req.body.org_id;
      start_date = req.body.start_date;
      end_date = req.body.end_date;
    }

    if (!org_id) {
      return res.status(400).json({ error: "Missing organization ID" });
    }

    // Verify org membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", org_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }

    // Rate limit: 10 per org per hour
    try {
      await rateLimiter.consume(org_id, 1);
    } catch (error: any) {
      const rlInfo = rateLimitJson(error.msBeforeNext / 1000);
      return res
        .setHeader("Retry-After", rlInfo.retryAfter)
        .status(429)
        .json(rlInfo.body);
    }

    // Build query
    let query = supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("organization_id", org_id);

    if (start_date) {
      query = query.gte("created_at", start_date);
    }

    if (end_date) {
      query = query.lte("created_at", end_date);
    }

    const { data: auditLogs, error: logsError } = await query.order("created_at", {
      ascending: false,
    });

    if (logsError) {
      return res.status(500).json({ error: "Failed to fetch audit logs" });
    }

    // Build CSV
    const csv = buildCSV(auditLogs || []);

    // Get today's date for filename
    const today = new Date().toISOString().split("T")[0];

    // Return CSV response
    return res
      .setHeader("Content-Type", "text/csv; charset=utf-8")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="ruleshift-audit-log-${today}.csv"`
      )
      .status(200)
      .send(csv);
  } catch (error) {
    console.error("Error exporting audit log:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
