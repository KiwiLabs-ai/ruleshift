import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Colors
const NAVY = rgb(0.102, 0.122, 0.239);      // #1a1f3d
const TEAL = rgb(0.176, 0.831, 0.749);      // #2dd4bf
const DARK_TEXT = rgb(0.133, 0.133, 0.133);  // #222
const MUTED = rgb(0.4, 0.4, 0.45);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.86, 0.15, 0.15);
const AMBER = rgb(0.85, 0.55, 0.05);
const GREEN = rgb(0.1, 0.65, 0.3);

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { brief_id, org_id } = body;

    if (!brief_id || !org_id) {
      return new Response(JSON.stringify({ error: "brief_id and org_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const rl = await checkRateLimit(org_id, "export-brief-pdf", 10, 3600);
    if (!rl.allowed) return rateLimitResponse(rl.reset_at, corsHeaders);

    // Fetch brief
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: brief, error: briefErr } = await admin
      .from("briefs")
      .select("*, alerts(severity)")
      .eq("id", brief_id)
      .eq("organization_id", org_id)
      .single();

    if (briefErr || !brief) {
      return new Response(JSON.stringify({ error: "Brief not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org name
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", org_id)
      .single();

    // Fetch action items
    const { data: actionItems } = await admin
      .from("brief_action_items")
      .select("*")
      .eq("brief_id", brief_id)
      .order("action_index", { ascending: true });

    // Parse content sections
    const content = brief.content ?? "";
    const sections = parseContentSections(content);
    const severity = Array.isArray(brief.alerts)
      ? brief.alerts[0]?.severity
      : brief.alerts?.severity ?? "informational";

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595; // A4
    const pageHeight = 842;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    function ensureSpace(needed: number) {
      if (y - needed < margin + 30) {
        // Footer on current page
        drawFooter(page);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    function drawFooter(p: any) {
      const footerText = "Generated by RuleShift — ruleshift.app";
      const timestamp = new Date().toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      p.drawText(footerText, { x: margin, y: 25, size: 7, font: helvetica, color: MUTED });
      const tsWidth = helvetica.widthOfTextAtSize(timestamp, 7);
      p.drawText(timestamp, { x: pageWidth - margin - tsWidth, y: 25, size: 7, font: helvetica, color: MUTED });
      // Teal line above footer
      p.drawRectangle({ x: margin, y: 38, width: contentWidth, height: 0.5, color: TEAL });
    }

    // === HEADER ===
    // Navy header bar
    page.drawRectangle({ x: 0, y: pageHeight - 80, width: pageWidth, height: 80, color: NAVY });
    page.drawText("RuleShift", { x: margin, y: pageHeight - 45, size: 20, font: helveticaBold, color: WHITE });
    page.drawText("Regulatory Brief", { x: margin, y: pageHeight - 65, size: 11, font: helvetica, color: TEAL });
    // Teal accent line
    page.drawRectangle({ x: 0, y: pageHeight - 82, width: pageWidth, height: 2, color: TEAL });

    y = pageHeight - 110;

    // === META ===
    const briefDate = new Date(brief.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const orgName = org?.name ?? "Organization";
    page.drawText(`Date: ${briefDate}`, { x: margin, y, size: 9, font: helvetica, color: MUTED });
    y -= 14;
    page.drawText(`Organization: ${orgName}`, { x: margin, y, size: 9, font: helvetica, color: MUTED });
    y -= 14;

    const sevLabel = severity === "critical" ? "Critical" : severity === "important" ? "Important" : "Informational";
    const sevColor = severity === "critical" ? RED : severity === "important" ? AMBER : TEAL;
    page.drawText(`Severity: `, { x: margin, y, size: 9, font: helvetica, color: MUTED });
    page.drawText(sevLabel, { x: margin + helvetica.widthOfTextAtSize("Severity: ", 9), y, size: 9, font: helveticaBold, color: sevColor });
    y -= 24;

    // === TITLE ===
    const titleLines = wrapText(brief.title, helveticaBold, 16, contentWidth);
    for (const line of titleLines) {
      ensureSpace(22);
      page.drawText(line, { x: margin, y, size: 16, font: helveticaBold, color: NAVY });
      y -= 22;
    }
    y -= 8;

    // === SUMMARY ===
    if (brief.summary) {
      ensureSpace(40);
      // Light teal background box
      const summaryLines = wrapText(brief.summary, helvetica, 10, contentWidth - 20);
      const boxHeight = summaryLines.length * 15 + 16;
      ensureSpace(boxHeight + 10);
      page.drawRectangle({
        x: margin,
        y: y - boxHeight + 8,
        width: contentWidth,
        height: boxHeight,
        color: rgb(0.93, 0.99, 0.98),
        borderColor: TEAL,
        borderWidth: 0.5,
      });
      // "TL;DR" label
      page.drawText("TL;DR", { x: margin + 10, y: y - 4, size: 7, font: helveticaBold, color: TEAL });
      y -= 18;
      for (const line of summaryLines) {
        page.drawText(line, { x: margin + 10, y, size: 10, font: helvetica, color: DARK_TEXT });
        y -= 15;
      }
      y -= 12;
    }

    // === CONTENT SECTIONS ===
    function drawSection(title: string, text: string) {
      if (!text) return;
      ensureSpace(40);
      // Teal left border
      const sectionLines = wrapText(text, helvetica, 10, contentWidth - 12);
      page.drawRectangle({ x: margin, y: y - 2, width: 3, height: 14, color: TEAL });
      page.drawText(title, { x: margin + 10, y, size: 12, font: helveticaBold, color: NAVY });
      y -= 20;
      for (const line of sectionLines) {
        ensureSpace(16);
        page.drawText(line, { x: margin + 10, y, size: 10, font: helvetica, color: DARK_TEXT });
        y -= 15;
      }
      y -= 10;
    }

    drawSection("What Changed", sections.whatChanged);
    drawSection("Who Is Affected", sections.whoAffected);

    // === ACTION ITEMS ===
    if (sections.actions.length > 0) {
      ensureSpace(40);
      page.drawRectangle({ x: margin, y: y - 2, width: 3, height: 14, color: TEAL });
      page.drawText("Required Actions", { x: margin + 10, y, size: 12, font: helveticaBold, color: NAVY });
      y -= 22;

      for (let i = 0; i < sections.actions.length; i++) {
        const actionText = sections.actions[i];
        const actionItem = (actionItems ?? []).find((ai: any) => ai.action_index === i);
        const isCompleted = actionItem?.completed ?? false;

        const lines = wrapText(actionText, helvetica, 10, contentWidth - 35);
        ensureSpace(lines.length * 15 + 8);

        // Number
        const numStr = `${i + 1}.`;
        page.drawText(numStr, { x: margin + 8, y, size: 10, font: helveticaBold, color: NAVY });

        // Status indicator
        const statusColor = isCompleted ? GREEN : MUTED;
        const statusText = isCompleted ? "✓" : "○";
        page.drawText(statusText, { x: pageWidth - margin - 15, y, size: 10, font: helvetica, color: statusColor });

        // Text
        for (const line of lines) {
          page.drawText(line, { x: margin + 25, y, size: 10, font: helvetica, color: DARK_TEXT });
          y -= 15;
        }
        y -= 4;
      }
      y -= 6;
    }

    // === DEADLINE ===
    if (sections.deadline) {
      ensureSpace(36);
      page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: 28, color: rgb(1, 0.95, 0.95), borderColor: RED, borderWidth: 0.5 });
      page.drawText("Deadline: ", { x: margin + 10, y: y - 2, size: 10, font: helveticaBold, color: RED });
      page.drawText(sections.deadline, {
        x: margin + 10 + helveticaBold.widthOfTextAtSize("Deadline: ", 10),
        y: y - 2,
        size: 10,
        font: helveticaBold,
        color: DARK_TEXT,
      });
      y -= 36;
    }

    drawSection("Business Impact", sections.impact);

    // Final footer
    drawFooter(page);

    // Save
    const pdfBytes = await pdfDoc.save();
    const today = new Date().toISOString().split("T")[0];

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ruleshift-brief-${today}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[export-brief-pdf] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseContentSections(content: string) {
  const result = {
    whatChanged: "",
    whoAffected: "",
    actions: [] as string[],
    deadline: "",
    impact: "",
  };

  if (!content) return result;

  const sectionMap: Record<string, string> = {
    "what changed": "whatChanged",
    "who is affected": "whoAffected",
    "required actions": "actions",
    "deadline": "deadline",
    "business impact": "impact",
  };

  const lines = content.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase().replace(/[:#*]/g, "").trim();

    if (sectionMap[lower]) {
      currentSection = lower;
      continue;
    }

    if (currentSection && trimmed) {
      const key = sectionMap[currentSection];
      if (key === "actions") {
        const cleaned = trimmed.replace(/^[\d.\-*]+\s*/, "");
        if (cleaned) result.actions.push(cleaned);
      } else if (key) {
        (result as any)[key] += ((result as any)[key] ? " " : "") + trimmed;
      }
    }
  }

  return result;
}
