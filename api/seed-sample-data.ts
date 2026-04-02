import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function setCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { organization_id, user_id } = req.body;
    if (!organization_id || !user_id) {
      return res.status(400).json({ error: "organization_id and user_id are required" });
    }

    const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: existingAlerts, error: checkErr } = await adminClient
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id);

    if (checkErr) throw checkErr;

    if ((existingAlerts?.length ?? 0) > 0) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Sample data already exists for this organization",
      });
    }

    const now = new Date().toISOString();
    const yesterdayContentHash = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";
    const todayContentHash = "z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1";

    const sampleAlertContent = `
    <div>
      <h1>New Policy Update: Data Privacy Requirements</h1>
      <p>The government has issued updated guidelines on personal data handling and storage.</p>
      <section>
        <h2>Key Changes:</h2>
        <ul>
          <li>All personal data must be encrypted at rest and in transit</li>
          <li>Data retention policies must be reviewed quarterly</li>
          <li>Users must be notified of any data breaches within 24 hours</li>
          <li>Third-party data processors require explicit written agreements</li>
        </ul>
      </section>
      <p>Effective date: Thirty days from publication.</p>
    </div>
    `;

    const { data: alert, error: alertErr } = await adminClient
      .from("alerts")
      .insert({
        organization_id,
        title: "Sample Alert: New Data Privacy Requirements",
        description: "Updated guidelines on personal data handling and storage requirements",
        status: "briefed",
        content_preview: sampleAlertContent.substring(0, 500),
        content_hash: todayContentHash,
        brief: `This policy update introduces stricter requirements for data privacy and protection. Organizations must implement encryption for all personal data, conduct quarterly data retention reviews, notify users of breaches within 24 hours, and establish written agreements with third-party processors. The effective date is 30 days from the policy publication date. This represents a significant increase in compliance obligations.`,
        briefed_at: now,
      })
      .select("id")
      .single();

    if (alertErr || !alert?.id) throw alertErr || new Error("Failed to create sample alert");

    await adminClient.from("activity_events").insert({
      organization_id,
      event_type: "sample_data_created",
      description: "Sample alert and brief created for onboarding",
    });

    await adminClient.from("audit_log").insert({
      organization_id,
      user_id,
      action: "sample_data_created",
      user_email: null,
      resource_type: "alert",
      resource_id: alert.id,
      details: "Sample alert and brief created during onboarding",
    }).then(() => {});

    return res.status(200).json({
      success: true,
      alert_id: alert.id,
      message: "Sample data created successfully",
    });
  } catch (err) {
    console.error("seed-sample-data error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
