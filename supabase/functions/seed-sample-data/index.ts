import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, user_id } = await req.json();
    if (!organization_id || !user_id) {
      return new Response(JSON.stringify({ error: "organization_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if org already has any alerts — skip if so
    const { count } = await admin
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert sample alert
    const { data: alertData, error: alertErr } = await admin
      .from("alerts")
      .insert({
        organization_id,
        title: "Sample: App Store Privacy Policy Update Detected",
        source_name: "Apple App Store Review Guidelines",
        severity: "important",
        is_read: false,
      })
      .select("id")
      .single();

    if (alertErr) throw alertErr;

    const briefContent = `## What Changed

Apple revised Section 5.1.2 of the App Store Review Guidelines. The update requires that all apps must now include detailed privacy nutrition label disclosures for every third-party SDK integrated into the app, not just the app's own data collection.

## Who Is Affected

Any organization that publishes iOS apps using third-party SDKs for analytics, advertising, crash reporting, or social features. This impacts most app publishers.

## Required Actions

1. Audit all third-party SDKs currently integrated in your iOS apps
2. Document what data each SDK collects, how it is used, and whether it is shared
3. Update your App Store privacy nutrition labels to include SDK-level disclosures
4. Review Apple's updated Privacy Details documentation for the required format
5. Submit updated privacy declarations before your next app update submission

## Deadline

Effective immediately for new submissions. Existing apps must comply on next update submission.

## Business Impact

Non-compliance will result in app review rejections. Apps with outdated privacy labels may be flagged during routine re-reviews. Budget 2-4 hours for SDK audit and label updates per app.`;

    // Insert sample brief
    const { data: briefData, error: briefErr } = await admin
      .from("briefs")
      .insert({
        organization_id,
        alert_id: alertData.id,
        title: "Apple Updates App Privacy Requirements — New Disclosure Rules for Third-Party SDKs",
        source_name: "Apple App Store Review Guidelines",
        summary:
          "Apple has updated Section 5.1.2 of the App Store Review Guidelines to require developers to disclose all third-party SDK data collection practices in their privacy nutrition labels. Apps must update their privacy declarations by the next submission.",
        content: briefContent,
        tags: ["sample", "app-store", "privacy", "sdk", "ios"],
      })
      .select("id")
      .single();

    if (briefErr) throw briefErr;

    // Link brief to alert
    await admin
      .from("alerts")
      .update({ brief_id: briefData.id })
      .eq("id", alertData.id);

    // Insert activity event
    await admin.from("activity_events").insert({
      organization_id,
      event_type: "sample_data",
      description: "Sample brief added to help you explore RuleShift",
    });

    // Audit log
    await admin.from("audit_log").insert({
      organization_id,
      user_id,
      action: "sample_data",
      user_email: "system",
      resource_type: "brief",
      resource_id: briefData.id,
      resource_name: "Sample brief",
      details: "Sample data seeded for new organization",
    }).then(() => {});

    return new Response(
      JSON.stringify({ success: true, brief_id: briefData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[seed-sample-data] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
