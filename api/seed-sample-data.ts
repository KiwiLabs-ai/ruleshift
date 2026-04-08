import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    let organization_id: string | null = null;
    let user_id: string | null = null;

    // Two allowed auth modes:
    //   1. Cron / internal: Bearer CRON_SECRET with organization_id (and
    //      optionally user_id) in the body.
    //   2. User: Bearer <user JWT>. We look up the user's org from profiles
    //      and ignore any organization_id in the body.
    const isCronCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (isCronCall) {
      organization_id = req.body?.organization_id ?? null;
      user_id = req.body?.user_id ?? null;
      if (!organization_id) {
        return res.status(400).json({ error: "organization_id is required for cron calls" });
      }
    } else {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      user_id = userData.user.id;

      const { data: profile, error: profileErr } = await userClient
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user_id)
        .single();
      if (profileErr || !profile?.organization_id) {
        return res.status(403).json({ error: "No organization found." });
      }
      organization_id = profile.organization_id;
    }

    // Idempotency check — head:true returns { count } not rows, so read
    // `count` directly. The previous implementation checked `.length > 0`
    // which was always false, so re-running this endpoint kept inserting
    // duplicate sample rows.
    const { count: existingAlertsCount, error: checkErr } = await adminClient
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .ilike("title", "Sample:%");

    if (checkErr) throw checkErr;

    if ((existingAlertsCount ?? 0) > 0) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Sample data already exists for this organization",
      });
    }

    const sourceName = "CFPB — Regulation E (Electronic Fund Transfers)";
    const alertTitle = "Sample: New amendments to CFPB Regulation E";

    // Pre-generated illustrative brief content. This is a fixture — we don't
    // call the model for seed data to keep onboarding free of API spend.
    const briefSummary =
      "The CFPB has finalized amendments to Regulation E expanding error-resolution timelines and requiring additional disclosures for peer-to-peer payment apps. Compliance teams at banks and fintechs will need to update disclosure flows within 90 days of the effective date.";

    const briefContent = `## What Changed
The CFPB issued a final rule amending 12 CFR Part 1005 (Regulation E) to extend the error-resolution investigation window for peer-to-peer payment services from 10 to 45 business days, and to require enhanced consumer disclosures at enrollment for unauthorized-transfer liability.

## Who Is Affected
Banks, credit unions, and non-bank fintech companies that offer consumer-to-consumer electronic fund transfer services (e.g., P2P apps, digital wallets, remittance platforms) operating in the United States.

## Required Actions
1. Review existing Regulation E disclosure templates against the new enrollment-disclosure requirements
2. Update internal policies for unauthorized-transfer investigations to accommodate the new 45-day window
3. Brief the customer support and dispute-resolution teams on the new timelines before the effective date
4. Audit P2P payment flows for compliance gaps against the amended rule text

## Deadline
Effective 90 days from publication in the Federal Register.

## Business Impact
This amendment increases operational burden on dispute-handling teams and will require updates to multiple customer-facing disclosure screens. Fintechs operating thin compliance functions may need to add headcount or automation to meet the expanded investigation window. Non-compliance exposes institutions to CFPB enforcement action and consumer civil liability.`;

    // Insert the sample alert first so we have an id to link the brief to.
    const { data: alert, error: alertErr } = await adminClient
      .from("alerts")
      .insert({
        organization_id,
        title: alertTitle,
        source_name: sourceName,
        severity: "important",
        is_read: false,
      })
      .select("id")
      .single();

    if (alertErr || !alert?.id) {
      throw alertErr || new Error("Failed to create sample alert");
    }

    // Insert a matching brief row.
    const { data: brief, error: briefErr } = await adminClient
      .from("briefs")
      .insert({
        organization_id,
        alert_id: alert.id,
        title: alertTitle,
        source_name: sourceName,
        summary: briefSummary,
        content: briefContent,
      })
      .select("id")
      .single();

    if (briefErr || !brief?.id) {
      // Roll back the orphan alert so the next run can retry cleanly.
      await adminClient.from("alerts").delete().eq("id", alert.id);
      throw briefErr || new Error("Failed to create sample brief");
    }

    // Link the alert to the brief.
    const { error: linkErr } = await adminClient
      .from("alerts")
      .update({ brief_id: brief.id })
      .eq("id", alert.id);
    if (linkErr) {
      console.error("seed-sample-data: failed to link alert → brief:", linkErr);
    }

    const { error: activityErr } = await adminClient.from("activity_events").insert({
      organization_id,
      event_type: "sample_data_created",
      description: "Sample alert and brief created for onboarding",
    });
    if (activityErr) {
      console.error("seed-sample-data: activity_events insert failed:", activityErr);
    }

    const { error: auditErr } = await adminClient.from("audit_log").insert({
      organization_id,
      user_id,
      action: "sample_data_created",
      user_email: null,
      resource_type: "alert",
      resource_id: alert.id,
      details: "Sample alert and brief created during onboarding",
    });
    if (auditErr) {
      console.error("seed-sample-data: audit_log insert failed:", auditErr);
    }

    return res.status(200).json({
      success: true,
      alert_id: alert.id,
      brief_id: brief.id,
      message: "Sample data created successfully",
    });
  } catch (err) {
    console.error("seed-sample-data error:", err);
    return res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  }
}
