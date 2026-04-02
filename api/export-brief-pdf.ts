import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

// Color definitions
const NAVY = rgb(0.102, 0.122, 0.239);
const TEAL = rgb(0.176, 0.831, 0.749);
const DARK_TEXT = rgb(0.133, 0.133, 0.133);
const MUTED = rgb(0.4, 0.4, 0.45);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.86, 0.15, 0.15);
const AMBER = rgb(0.85, 0.55, 0.05);
const GREEN = rgb(0.1, 0.65, 0.3);

interface ContentSection {
  title: string;
  content: string;
}

function parseContentSections(content: string): ContentSection[] {
  // Parse content sections from markdown-like format
  // Expected format:
  // # Title
  // Content here
  // # Another Title
  // More content

  const sections: ContentSection[] = [];
  const lines = content.split("\n");

  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      // Save previous section
      if (currentTitle && currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join("\n").trim(),
        });
      }
      currentTitle = line.substring(2).trim();
      currentContent = [];
    } else if (line.trim()) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle && currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: any
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function generatePDF(brief: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]); // Letter size
  let yPosition = 750;

  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 36;
  const marginY = 36;
  const contentWidth = pageWidth - 2 * marginX;

  // Helper to add new page if needed
  const ensureSpace = (requiredSpace: number) => {
    if (yPosition - requiredSpace < marginY) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = pageHeight - marginY;
    }
  };

  // Header bar with NAVY background and TEAL accent
  page.drawRectangle({
    x: 0,
    y: yPosition - 60,
    width: pageWidth,
    height: 60,
    color: NAVY,
  });

  page.drawText("RuleShift Brief", {
    x: marginX,
    y: yPosition - 40,
    size: 24,
    font: helveticaBold,
    color: WHITE,
  });

  page.drawRectangle({
    x: 0,
    y: yPosition - 65,
    width: pageWidth,
    height: 5,
    color: TEAL,
  });

  yPosition -= 90;

  // Meta information
  const metaData = [
    { label: "Source", value: brief.source_name },
    { label: "Published", value: new Date(brief.created_at).toLocaleDateString() },
  ];

  for (const meta of metaData) {
    page.drawText(meta.label, {
      x: marginX,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: MUTED,
    });

    page.drawText(meta.value, {
      x: marginX + 80,
      y: yPosition,
      size: 10,
      font: helvetica,
      color: DARK_TEXT,
    });

    yPosition -= 18;
  }

  yPosition -= 12;

  // Title
  ensureSpace(40);
  const titleLines = wrapText(brief.title, contentWidth, 18, helveticaBold);
  for (const line of titleLines) {
    page.drawText(line, {
      x: marginX,
      y: yPosition,
      size: 18,
      font: helveticaBold,
      color: NAVY,
    });
    yPosition -= 22;
  }

  yPosition -= 12;

  // Summary box (TL;DR)
  ensureSpace(80);
  page.drawRectangle({
    x: marginX,
    y: yPosition - 70,
    width: contentWidth,
    height: 70,
    color: rgb(0.95, 0.97, 0.99), // Light blue background
  });

  page.drawText("TL;DR", {
    x: marginX + 12,
    y: yPosition - 20,
    size: 12,
    font: helveticaBold,
    color: NAVY,
  });

  const summaryLines = wrapText(brief.summary, contentWidth - 24, 10, helvetica);
  let summaryY = yPosition - 40;
  for (const line of summaryLines.slice(0, 3)) {
    page.drawText(line, {
      x: marginX + 12,
      y: summaryY,
      size: 10,
      font: helvetica,
      color: DARK_TEXT,
    });
    summaryY -= 15;
  }

  yPosition -= 90;

  // Parse content sections
  const contentSections = parseContentSections(brief.content);

  for (const section of contentSections) {
    ensureSpace(30);

    // Section title with TEAL color
    page.drawText(section.title, {
      x: marginX,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: TEAL,
    });

    yPosition -= 20;

    // Section content
    const contentLines = wrapText(section.content, contentWidth, 10, helvetica);
    for (const line of contentLines) {
      ensureSpace(15);
      page.drawText(line, {
        x: marginX,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: DARK_TEXT,
      });
      yPosition -= 15;
    }

    yPosition -= 12;
  }

  // Required Actions section (if present)
  if (brief.required_actions) {
    ensureSpace(40);

    page.drawText("Required Actions", {
      x: marginX,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: TEAL,
    });

    yPosition -= 20;

    const actions = Array.isArray(brief.required_actions)
      ? brief.required_actions
      : brief.required_actions.split("\n");

    for (let i = 0; i < actions.length; i++) {
      ensureSpace(20);
      const action = String(actions[i]).trim();
      if (action) {
        page.drawText(`${i + 1}. ${action}`, {
          x: marginX + 12,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: DARK_TEXT,
        });
        yPosition -= 18;
      }
    }

    yPosition -= 12;
  }

  // Deadline section (if present)
  if (brief.deadline) {
    ensureSpace(50);

    page.drawRectangle({
      x: marginX,
      y: yPosition - 40,
      width: contentWidth,
      height: 40,
      color: RED,
    });

    page.drawText("Deadline", {
      x: marginX + 12,
      y: yPosition - 15,
      size: 12,
      font: helveticaBold,
      color: WHITE,
    });

    page.drawText(new Date(brief.deadline).toLocaleDateString(), {
      x: marginX + 12,
      y: yPosition - 30,
      size: 11,
      font: helvetica,
      color: WHITE,
    });

    yPosition -= 55;
  }

  // Business Impact section (if present)
  if (brief.business_impact) {
    ensureSpace(40);

    page.drawText("Business Impact", {
      x: marginX,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: TEAL,
    });

    yPosition -= 20;

    const impactLines = wrapText(brief.business_impact, contentWidth, 10, helvetica);
    for (const line of impactLines) {
      ensureSpace(15);
      page.drawText(line, {
        x: marginX,
        y: yPosition,
        size: 10,
        font: helvetica,
        color: DARK_TEXT,
      });
      yPosition -= 15;
    }

    yPosition -= 12;
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  for (const currentPage of pages) {
    currentPage.drawText("© 2026 RuleShift. All rights reserved.", {
      x: marginX,
      y: 20,
      size: 8,
      font: helvetica,
      color: MUTED,
    });

    currentPage.drawText(
      `Generated on ${new Date().toLocaleDateString()}`,
      {
        x: pageWidth - marginX - 150,
        y: 20,
        size: 8,
        font: helvetica,
        color: MUTED,
      }
    );
  }

  return await pdfDoc.save();
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

    // Get brief_id from query params or body
    let brief_id: string | undefined;

    if (req.method === "GET") {
      brief_id = req.query.brief_id as string;
    } else {
      brief_id = req.body.brief_id;
    }

    if (!brief_id) {
      return res.status(400).json({ error: "Missing brief ID" });
    }

    // Fetch brief
    const { data: brief, error: briefError } = await supabaseAdmin
      .from("briefs")
      .select("*")
      .eq("id", brief_id)
      .single();

    if (briefError || !brief) {
      return res.status(404).json({ error: "Brief not found" });
    }

    // Verify organization membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", brief.organization_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: "Not authorized to export this brief" });
    }

    // Rate limit: 10 per org per hour
    try {
      await rateLimiter.consume(brief.organization_id, 1);
    } catch (error: any) {
      const rlInfo = rateLimitJson(error.msBeforeNext / 1000);
      return res
        .setHeader("Retry-After", rlInfo.retryAfter)
        .status(429)
        .json(rlInfo.body);
    }

    // Generate PDF
    const pdfBytes = await generatePDF(brief);
    const pdfBuffer = Buffer.from(pdfBytes);

    // Return PDF response
    return res
      .setHeader("Content-Type", "application/pdf")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="ruleshift-brief-${brief_id}.pdf"`
      )
      .status(200)
      .send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
