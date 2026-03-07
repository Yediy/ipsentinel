import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import PDFDocument from "https://esm.sh/pdfkit@0.13.0";
import * as JSZip from "https://esm.sh/jszip@3.10.1";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── Storage key helper ──────────────────────────────────────────────────
function storageKey(userId: string, intakeId: string, kind: string, ext: string) {
  return `ipgenie/${userId}/${intakeId}/${kind}.${ext}`;
}

// ── Patent section generation ───────────────────────────────────────────
interface IntakeAnswers {
  title?: string;
  one_sentence?: string;
  problem?: string;
  users_industry?: string;
  current_solutions?: string;
  current_limits?: string;
  differentiators?: string[];
  technical_explanation?: string;
  components_steps?: string[];
  walkthrough?: string;
  variations?: string;
  required_optional?: string;
  constraints?: string;
  environment?: string;
  equivalents?: string;
  keywords?: string[];
  similar_products?: string;
  figures?: string[];
}

async function generatePatentSection(
  section: string,
  answers: IntakeAnswers,
  openaiKey: string
): Promise<string> {
  const prompts: Record<string, string> = {
    title: `Based on the invention: "${answers.title}" - "${answers.one_sentence}"
Generate a formal patent title that is:
- Descriptive but concise (under 15 words)
- Includes key technical terms
- Follows USPTO title conventions`,
    abstract: `Generate a patent abstract (150-250 words) for an invention:
Title: ${answers.title}
Description: ${answers.one_sentence}
Problem: ${answers.problem}
Technical explanation: ${answers.technical_explanation}

The abstract should summarize the invention, its purpose, and key technical features.`,
    background: `Generate a patent Background section (2-3 paragraphs) covering:
Problem addressed: ${answers.problem}
Current solutions: ${answers.current_solutions}
Their limitations: ${answers.current_limits}
Target users: ${answers.users_industry}

Write in formal patent language, establishing the technical field and prior art context.`,
    summary: `Generate a patent Summary of the Invention (2-4 paragraphs) for:
Invention: ${answers.one_sentence}
Key differentiators: ${answers.differentiators?.join(", ")}
Required components: ${answers.required_optional}

Summarize the invention's key aspects and advantages over prior art.`,
    detailed_description: `Generate a Detailed Description section (4-6 paragraphs) for:
Technical explanation: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(", ")}
Usage walkthrough: ${answers.walkthrough}
Operating environment: ${answers.environment}
Constraints/specs: ${answers.constraints || "N/A"}

Describe the invention in detail with reference to the figures. Use formal patent language.`,
    claims: `Generate patent claims (10-15 claims) for:
Invention: ${answers.one_sentence}
Technical details: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(", ")}
Variations: ${answers.variations}
Required vs optional: ${answers.required_optional}
Equivalents: ${answers.equivalents}

Include:
- 2-3 independent claims (broad scope)
- 7-12 dependent claims (specific features)

Format each claim properly with claim numbers and proper dependency references.`,
    figure_descriptions: `Based on the selected figure types: ${answers.figures?.join(", ")}
And the invention: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(", ")}

Generate brief descriptions and prompts for creating each figure type. Include what elements should be labeled.`,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert patent attorney drafting provisional patent applications. Write in formal patent language following USPTO conventions. Be thorough but precise.",
        },
        { role: "user", content: prompts[section] },
      ],
      max_tokens: section === "claims" ? 3000 : 1500,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Section metadata ────────────────────────────────────────────────────
const SECTION_META = [
  { key: "abstract", label: "Abstract" },
  { key: "background", label: "Background of the Invention" },
  { key: "summary", label: "Summary of the Invention" },
  { key: "detailed_description", label: "Detailed Description" },
  { key: "claims", label: "Claims" },
  { key: "figure_descriptions", label: "Figure Descriptions" },
];

// ── Main handler ────────────────────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") return createCorsPreflightResponse(origin);

  // ── Auth: only allow calls with the service role key ────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let intakeId: string | undefined;
  let filingId: string | undefined;

  try {
    const body = await req.json();
    intakeId = body.intake_id;
    filingId = body.filing_id;
    console.log("Generate provisional called:", { intakeId, filingId });

    if (!intakeId || !filingId) {
      return new Response(
        JSON.stringify({ error: "intake_id and filing_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: intake, error: intakeError } = await supabase
      .from("intakes").select("*").eq("id", intakeId).single();

    if (intakeError || !intake) throw new Error("Intake not found");

    await supabase.from("intakes").update({ status: "generating" }).eq("id", intakeId);

    const { data: job } = await supabase
      .from("generation_jobs")
      .upsert({ intake_id: intakeId, status: "running", attempts: 1 }, { onConflict: "intake_id" })
      .select("id").single();

    const answers = intake.answers_json as IntakeAnswers;

    // ── Generate all sections ─────────────────────────────────────────
    const sectionKeys = ["title", "abstract", "background", "summary", "detailed_description", "claims", "figure_descriptions"];
    const generatedContent: Record<string, string> = {};

    for (const section of sectionKeys) {
      console.log(`Generating section: ${section}`);
      try {
        generatedContent[section] = await generatePatentSection(section, answers, OPENAI_API_KEY!);
      } catch (err) {
        console.error(`Error generating ${section}:`, err);
        generatedContent[section] = `[Error generating ${section}]`;
      }
    }

    // ── Update filing ─────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("filings")
      .update({
        title: answers.title || generatedContent.title,
        abstract: generatedContent.abstract,
        background: generatedContent.background,
        summary: generatedContent.summary,
        detailed_description: generatedContent.detailed_description,
        claims: generatedContent.claims,
        status: "ready",
        generated_content: {
          figure_descriptions: generatedContent.figure_descriptions,
          generated_at: new Date().toISOString(),
          tier: "provisional",
        },
      })
      .eq("id", filingId);

    if (updateError) throw updateError;

    // ── Generate documents ────────────────────────────────────────────
    const userId = intake.user_id;
    const deleteAfter = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const docTitle = answers.title || generatedContent.title || "Patent Specification";

    const pdfBuffer = await generatePDF(generatedContent, docTitle);
    const pdfKey = storageKey(userId, intakeId, "spec_pdf", "pdf");
    await supabase.storage.from("filings").upload(pdfKey, pdfBuffer, { contentType: "application/pdf", upsert: true });

    const docxBuffer = await generateDocx(generatedContent, docTitle);
    const docxKey = storageKey(userId, intakeId, "spec_docx", "docx");
    await supabase.storage.from("filings").upload(docxKey, docxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

    const checklistBuffer = await generateChecklistPDF(answers, generatedContent);
    const checklistKey = storageKey(userId, intakeId, "filing_checklist", "pdf");
    await supabase.storage.from("filings").upload(checklistKey, checklistBuffer, { contentType: "application/pdf", upsert: true });

    await supabase.from("documents").insert([
      { filing_id: filingId, intake_id: intakeId, kind: "pdf" as const, doc_type: "spec_pdf", storage_key: pdfKey, url: pdfKey, delete_after: deleteAfter },
      { filing_id: filingId, intake_id: intakeId, kind: "docx" as const, doc_type: "spec_docx", storage_key: docxKey, url: docxKey, delete_after: deleteAfter },
      { filing_id: filingId, intake_id: intakeId, kind: "pdf" as const, doc_type: "filing_checklist", storage_key: checklistKey, url: checklistKey, delete_after: deleteAfter },
    ]);

    await supabase.from("intakes").update({ status: "ready" }).eq("id", intakeId);

    if (job) {
      await supabase.from("generation_jobs").update({ status: "succeeded" }).eq("id", job.id);
    }

    // ── Notifications ─────────────────────────────────────────────────
    await supabase.rpc("notify_user", {
      p_user_id: intake.user_id, p_filing_id: filingId,
      p_subject: "Patent Draft Ready", p_body: "Your provisional patent draft is ready for review.",
    });

    const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", intake.user_id).single();
    if (profile?.email) {
      const viewUrl = `https://ipsentinel.lovable.app/patent/${filingId}`;
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/email-sender`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({
            to: profile.email, subject: "Your Provisional Patent Draft is Ready!",
            html: generateEmailHTML(docTitle, viewUrl), filing_id: filingId, notification_type: "patent_ready",
          }),
        });
      } catch (emailError) { console.error("Email error:", emailError); }
    }

    console.log("Generation complete for filing:", filingId);
    return new Response(
      JSON.stringify({ success: true, filing_id: filingId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Generation error:", error);
    if (intakeId) {
      await supabase.from("intakes").update({ status: "failed" }).eq("id", intakeId);
      await supabase.from("generation_jobs")
        .update({ status: "failed", last_error: error?.message || "Unknown error" })
        .eq("intake_id", intakeId).eq("status", "running");
    }
    await captureException(error, { tags: { function: "generate-provisional" }, request: req });
    return new Response(
      JSON.stringify({ error: error?.message || "Generation failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════
// PDF Generation — watermark, footer branding, page numbers, TOC
// ═══════════════════════════════════════════════════════════════════════
async function generatePDF(
  content: Record<string, string>,
  title: string
): Promise<Uint8Array> {
  const pdf = new PDFDocument({ size: "A4", margin: 60, bufferPages: true });

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    pdf.on("end", () => {
      const buffer = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
      let off = 0;
      for (const c of chunks) { buffer.set(c, off); off += c.length; }
      resolve(buffer);
    });
    pdf.on("error", reject);

    const PAGE_W = 595.28; // A4 width in points
    const PAGE_H = 841.89;
    const MARGIN = 60;
    const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // ── Cover page ──────────────────────────────────────────────────
    pdf.moveDown(6);
    pdf.fontSize(10).font("Helvetica").fillColor("#999999").text("PROVISIONAL PATENT APPLICATION", { align: "center" });
    pdf.moveDown(1);
    pdf.fontSize(26).font("Helvetica-Bold").fillColor("#1a1a2e").text(title, { align: "center" });
    pdf.moveDown(0.5);
    pdf.moveTo(MARGIN + 100, pdf.y).lineTo(PAGE_W - MARGIN - 100, pdf.y).strokeColor("#2563eb").lineWidth(2).stroke();
    pdf.moveDown(1.5);
    pdf.fontSize(11).font("Helvetica").fillColor("#555555").text(`Generated: ${generatedDate}`, { align: "center" });
    pdf.moveDown(0.3);
    pdf.text("IP Sentinel™ — Provisional Patent Generation Service", { align: "center" });
    pdf.moveDown(4);
    pdf.fontSize(9).fillColor("#999999").text("CONFIDENTIAL — FOR REVIEW PURPOSES ONLY", { align: "center" });
    pdf.moveDown(0.3);
    pdf.text("This AI-generated draft is intended as a starting point. Professional attorney review is strongly recommended before filing.", { align: "center" });

    // ── Table of Contents ───────────────────────────────────────────
    pdf.addPage();
    pdf.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("Table of Contents", { align: "left" });
    pdf.moveDown(0.5);
    pdf.moveTo(MARGIN, pdf.y).lineTo(PAGE_W - MARGIN, pdf.y).strokeColor("#e4e4e7").lineWidth(1).stroke();
    pdf.moveDown(0.8);

    let tocPage = 3; // content starts on page 3
    for (const sec of SECTION_META) {
      if (content[sec.key]) {
        pdf.fontSize(12).font("Helvetica").fillColor("#2563eb").text(`${sec.label}`, MARGIN, pdf.y, { continued: false });
        pdf.moveDown(0.4);
      }
    }

    // ── Content pages ───────────────────────────────────────────────
    for (const sec of SECTION_META) {
      if (!content[sec.key]) continue;
      pdf.addPage();

      // Section heading
      pdf.fontSize(16).font("Helvetica-Bold").fillColor("#1a1a2e").text(sec.label);
      pdf.moveDown(0.3);
      pdf.moveTo(MARGIN, pdf.y).lineTo(PAGE_W - MARGIN, pdf.y).strokeColor("#2563eb").lineWidth(1.5).stroke();
      pdf.moveDown(0.6);

      // Section body
      pdf.fontSize(11).font("Helvetica").fillColor("#333333").text(content[sec.key], {
        align: "justify",
        lineGap: 3,
        paragraphGap: 6,
      });
    }

    // ── Claim Comparison Chart ──────────────────────────────────────
    if (content.claims) {
      pdf.addPage();
      pdf.fontSize(16).font("Helvetica-Bold").fillColor("#1a1a2e").text("Claim Structure Chart");
      pdf.moveDown(0.3);
      pdf.moveTo(MARGIN, pdf.y).lineTo(PAGE_W - MARGIN, pdf.y).strokeColor("#2563eb").lineWidth(1.5).stroke();
      pdf.moveDown(0.6);

      pdf.fontSize(9).font("Helvetica").fillColor("#666666").text(
        "This chart visualizes the hierarchy of independent and dependent claims, showing cross-references and scope relationships.",
        { lineGap: 2 }
      );
      pdf.moveDown(0.8);

      // Parse claims into structured data
      const claimLines = content.claims.split(/\n+/).filter((l: string) => l.trim());
      interface ParsedClaim { num: number; text: string; dependsOn: number | null; isIndependent: boolean; }
      const parsedClaims: ParsedClaim[] = [];

      for (const line of claimLines) {
        const numMatch = line.match(/^\s*(?:Claim\s+)?(\d+)[\.\:\)]/i);
        if (!numMatch) continue;
        const num = parseInt(numMatch[1]);
        const depMatch = line.match(/(?:claim|claims?)\s+(\d+)/i);
        const dependsOn = depMatch ? parseInt(depMatch[1]) : null;
        const isIndependent = !dependsOn || dependsOn === num;
        parsedClaims.push({ num, text: line.trim(), dependsOn: isIndependent ? null : dependsOn, isIndependent });
      }

      if (parsedClaims.length === 0) {
        // Fallback: just list claims as numbered items
        pdf.fontSize(10).font("Helvetica").fillColor("#333333").text(content.claims, { lineGap: 3 });
      } else {
        const COL_NUM = MARGIN;
        const COL_TYPE = MARGIN + 45;
        const COL_REF = MARGIN + 145;
        const COL_DESC = MARGIN + 220;
        const TABLE_W = PAGE_W - 2 * MARGIN;

        // Table header
        const headerY = pdf.y;
        pdf.rect(MARGIN, headerY, TABLE_W, 22).fillAndStroke("#1a1a2e", "#1a1a2e");
        pdf.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff");
        pdf.text("#", COL_NUM + 6, headerY + 6, { width: 35 });
        pdf.text("Type", COL_TYPE + 6, headerY + 6, { width: 90 });
        pdf.text("Depends On", COL_REF + 6, headerY + 6, { width: 70 });
        pdf.text("Summary", COL_DESC + 6, headerY + 6, { width: TABLE_W - 226 });
        pdf.y = headerY + 22;

        // Table rows
        for (let i = 0; i < parsedClaims.length; i++) {
          const claim = parsedClaims[i];
          const rowY = pdf.y;
          const indent = claim.isIndependent ? 0 : 12;
          const rowH = 20;

          // Check page break
          if (rowY + rowH > PAGE_H - 60) {
            pdf.addPage();
          }

          const currentY = pdf.y;

          // Alternate row background
          if (i % 2 === 0) {
            pdf.rect(MARGIN, currentY, TABLE_W, rowH).fill("#f8f9fa");
          }

          // Row border
          pdf.moveTo(MARGIN, currentY + rowH).lineTo(MARGIN + TABLE_W, currentY + rowH).strokeColor("#e4e4e7").lineWidth(0.5).stroke();

          // Claim number
          pdf.fontSize(9).font(claim.isIndependent ? "Helvetica-Bold" : "Helvetica")
            .fillColor(claim.isIndependent ? "#2563eb" : "#555555");
          pdf.text(`${claim.num}`, COL_NUM + 6 + indent, currentY + 5, { width: 35 - indent });

          // Type badge
          pdf.fontSize(8).font("Helvetica-Bold")
            .fillColor(claim.isIndependent ? "#16a34a" : "#9333ea");
          pdf.text(claim.isIndependent ? "Independent" : "Dependent", COL_TYPE + 6, currentY + 5, { width: 90 });

          // Depends on
          pdf.fontSize(9).font("Helvetica").fillColor("#666666");
          pdf.text(claim.dependsOn ? `Claim ${claim.dependsOn}` : "—", COL_REF + 6, currentY + 5, { width: 70 });

          // Summary (truncated)
          const summary = claim.text.replace(/^\s*(?:Claim\s+)?\d+[\.\:\)]\s*/i, "").slice(0, 80);
          pdf.fontSize(8).font("Helvetica").fillColor("#333333");
          pdf.text(summary + (claim.text.length > 80 ? "…" : ""), COL_DESC + 6, currentY + 5, { width: TABLE_W - 226 });

          pdf.y = currentY + rowH;
        }

        // Legend
        pdf.moveDown(1);
        pdf.fontSize(9).font("Helvetica-Bold").fillColor("#1a1a2e").text("Legend:");
        pdf.moveDown(0.3);
        pdf.fontSize(8).font("Helvetica");
        pdf.fillColor("#16a34a").text("■ Independent Claim", { continued: true });
        pdf.fillColor("#333333").text("  —  Broad scope, standalone protection", { continued: false });
        pdf.fillColor("#9333ea").text("■ Dependent Claim", { continued: true });
        pdf.fillColor("#333333").text("  —  Narrows scope, references a parent claim", { continued: false });

        // Stats summary
        pdf.moveDown(0.8);
        const indCount = parsedClaims.filter(c => c.isIndependent).length;
        const depCount = parsedClaims.filter(c => !c.isIndependent).length;
        pdf.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a2e")
          .text(`Total: ${parsedClaims.length} claims (${indCount} independent, ${depCount} dependent)`);
      }
    }

    // ── Post-render: add watermarks, footers, page numbers ─────────
    const pageCount = pdf.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      pdf.switchToPage(i);

      // Diagonal watermark (light)
      pdf.save();
      pdf.translate(PAGE_W / 2, PAGE_H / 2);
      pdf.rotate(-45);
      pdf.fontSize(60).font("Helvetica-Bold").fillColor("#f0f0f0").opacity(0.15)
        .text("IP SENTINEL", -200, -30, { align: "center" });
      pdf.restore();
      pdf.opacity(1);

      // Footer bar
      const footerY = PAGE_H - 40;
      pdf.moveTo(MARGIN, footerY - 5).lineTo(PAGE_W - MARGIN, footerY - 5).strokeColor("#e4e4e7").lineWidth(0.5).stroke();

      pdf.fontSize(8).font("Helvetica").fillColor("#999999");
      pdf.text("IP Sentinel™ — Provisional Patent Application", MARGIN, footerY, { width: 250 });
      pdf.text(`Page ${i + 1} of ${pageCount}`, PAGE_W - MARGIN - 80, footerY, { width: 80, align: "right" });

      // Top-right header on content pages (skip cover)
      if (i > 0) {
        pdf.fontSize(7).fillColor("#cccccc").text("CONFIDENTIAL DRAFT", PAGE_W - MARGIN - 100, 25, { width: 100, align: "right" });
      }
    }

    pdf.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DOCX Generation — Proper OOXML ZIP archive with styles
// ═══════════════════════════════════════════════════════════════════════
async function generateDocx(
  content: Record<string, string>,
  title: string
): Promise<Uint8Array> {
  const zip = new JSZip.default();
  const generatedDate = new Date().toISOString();

  // [Content_Types].xml
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  // _rels/.rels
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  // word/_rels/document.xml.rels
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`);

  // word/styles.xml — professional patent document styles
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/><w:color w:val="1a1a2e"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:color w:val="555555"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="360" w:after="120"/><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1a1a2e"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:jc w:val="both"/></w:pPr>
    <w:rPr><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Footer">
    <w:name w:val="Footer"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
    <w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TOCHeading">
    <w:name w:val="TOC Heading"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1a1a2e"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TOC1">
    <w:name w:val="toc 1"/>
    <w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:color w:val="2563eb"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Watermark">
    <w:name w:val="Watermark"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:sz w:val="18"/><w:color w:val="CCCCCC"/></w:rPr>
  </w:style>
</w:styles>`);

  // word/settings.xml
  zip.file("word/settings.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>
</w:settings>`);

  // word/footer1.xml — IP Sentinel branding + page numbers
  zip.file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:pStyle w:val="Footer"/><w:jc w:val="center"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>
      <w:t xml:space="preserve">IP Sentinel™ — Provisional Patent Application  |  CONFIDENTIAL DRAFT  |  Page </w:t>
    </w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="999999"/></w:rPr>
      <w:t xml:space="preserve"> of </w:t>
    </w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText> NUMPAGES </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>`);

  // word/document.xml — the actual content
  let body = "";

  // Cover page
  body += `<w:p><w:pPr><w:pStyle w:val="Watermark"/><w:spacing w:before="2400"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="999999"/></w:rPr><w:t>PROVISIONAL PATENT APPLICATION</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>
    <w:r><w:t>${esc(title)}</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>
    <w:r><w:t>Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>
    <w:r><w:t>IP Sentinel™ — Provisional Patent Generation Service</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:pStyle w:val="Watermark"/><w:spacing w:before="1200"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="CCCCCC"/></w:rPr><w:t>CONFIDENTIAL — FOR REVIEW PURPOSES ONLY</w:t></w:r></w:p>`;
  body += `<w:p><w:pPr><w:pStyle w:val="Watermark"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="CCCCCC"/></w:rPr><w:t>This AI-generated draft is intended as a starting point. Professional attorney review is strongly recommended.</w:t></w:r></w:p>`;

  // Page break before TOC
  body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

  // Table of Contents
  body += `<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr>
    <w:r><w:t>Table of Contents</w:t></w:r></w:p>`;
  for (const sec of SECTION_META) {
    if (content[sec.key]) {
      body += `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr>
        <w:r><w:t>${esc(sec.label)}</w:t></w:r></w:p>`;
    }
  }

  // Content sections
  for (const sec of SECTION_META) {
    if (!content[sec.key]) continue;

    // Page break before each section
    body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

    // Heading
    body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${esc(sec.label)}</w:t></w:r></w:p>`;

    // Paragraphs
    const paragraphs = content[sec.key].split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      body += `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>
        <w:r><w:t xml:space="preserve">${esc(trimmed)}</w:t></w:r></w:p>`;
    }
  }

  // Section properties with footer reference
  const sectionProps = `<w:sectPr>
    <w:footerReference w:type="default" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId3"/>
    <w:pgSz w:w="12240" w:h="15840"/>
    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>
  </w:sectPr>`;

  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}${sectionProps}</w:body>
</w:document>`);

  // docProps/core.xml
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${esc(title)}</dc:title>
  <dc:creator>IP Sentinel™</dc:creator>
  <dc:description>Provisional Patent Application — AI-Generated Draft</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${generatedDate}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${generatedDate}</dcterms:modified>
</cp:coreProperties>`);

  // docProps/app.xml
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>IP Sentinel™</Application>
  <Company>IP Sentinel</Company>
</Properties>`);

  const arrayBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Uint8Array(arrayBuffer);
}

// ═══════════════════════════════════════════════════════════════════════
// Filing Checklist PDF — Pre-filing guidance and requirements
// ═══════════════════════════════════════════════════════════════════════
async function generateChecklistPDF(
  answers: IntakeAnswers,
  content: Record<string, string>
): Promise<Uint8Array> {
  const pdf = new PDFDocument({ size: "A4", margin: 50 });

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    pdf.on("end", () => {
      const buffer = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
      let off = 0;
      for (const c of chunks) { buffer.set(c, off); off += c.length; }
      resolve(buffer);
    });
    pdf.on("error", reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 50;
    const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Cover
    pdf.moveDown(5);
    pdf.fontSize(10).font("Helvetica").fillColor("#999999").text("PROVISIONAL PATENT APPLICATION", { align: "center" });
    pdf.moveDown(1);
    pdf.fontSize(24).font("Helvetica-Bold").fillColor("#1a1a2e").text("Filing Checklist", { align: "center" });
    pdf.moveDown(0.5);
    pdf.moveTo(MARGIN + 80, pdf.y).lineTo(PAGE_W - MARGIN - 80, pdf.y).strokeColor("#2563eb").lineWidth(2).stroke();
    pdf.moveDown(1.5);
    pdf.fontSize(11).font("Helvetica").fillColor("#555555").text(`Invention: ${answers.title || "Untitled"}`, { align: "center" });
    pdf.moveDown(0.3);
    pdf.text(`Generated: ${generatedDate}`, { align: "center" });
    pdf.moveDown(0.3);
    pdf.text("IP Sentinel™ — Provisional Patent Filing Guide", { align: "center" });
    pdf.moveDown(4);
    pdf.fontSize(9).fillColor("#999999").text("Complete these steps before submitting your provisional application.", { align: "center" });

    // Content sections
    pdf.addPage();
    pdf.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("Pre-Filing Checklist");
    pdf.moveDown(0.8);

    const checklist = [
      { item: "Complete all answers", details: "Ensure all 18 wizard questions are answered thoroughly." },
      { item: "Quality score ≥ 72%", details: "Click 'Score & Check Quality' to verify your submission meets USPTO standards." },
      { item: "Review the specification PDF", details: "Read the generated spec for accuracy, technical clarity, and completeness." },
      { item: "Verify all claims", details: "Review independent and dependent claims for scope and proper dependencies." },
      { item: "Check figure descriptions", details: "Confirm all referenced figures are properly described and labeled." },
      { item: "Abstract compliance", details: "Ensure abstract is 250 words or fewer and concise." },
      { item: "Title verification", details: "Confirm the invention title is descriptive and follows USPTO conventions." },
      { item: "Prior art review", details: "List any known similar products or patents in the provided field." },
      { item: "Component accuracy", details: "Verify all listed components and steps are accurately described." },
      { item: "Payment confirmation", details: "Proceed to payment via Stripe using the secure checkout flow." },
    ];

    for (const check of checklist) {
      pdf.fontSize(11).font("Helvetica-Bold").fillColor("#2563eb").text(`☑ ${check.item}`);
      pdf.fontSize(10).font("Helvetica").fillColor("#666666").text(check.details, { lineGap: 2 });
      pdf.moveDown(0.6);
    }

    // USPTO Requirements
    pdf.addPage();
    pdf.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("USPTO Provisional Requirements");
    pdf.moveDown(0.8);

    const usptoreqs = [
      { title: "Specification", text: "Your specification PDF must include: abstract, background, summary, detailed description, and claims. All provided." },
      { title: "Drawings (Optional)", text: "Figure descriptions are included. You may submit drawings or sketches separately to the USPTO." },
      { title: "Filing Fee", text: "Micro-entity: $65 | Small-entity: $260 | Large-entity: $520. Payment processed via Stripe." },
      { title: "Cover Sheet", text: "Submit Form SB/16 with your application. Download from USPTO.gov." },
      { title: "Assignment (If Applicable)", text: "If assigning rights, submit Form SB/17 or equivalent assignment agreement." },
    ];

    for (const req of usptoreqs) {
      pdf.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a2e").text(req.title);
      pdf.fontSize(10).font("Helvetica").fillColor("#555555").text(req.text, { lineGap: 2 });
      pdf.moveDown(0.8);
    }

    // Next Steps
    pdf.addPage();
    pdf.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("Next Steps After Payment");
    pdf.moveDown(0.8);

    const nextsteps = [
      "1. Download both PDF and DOCX specification files from your dashboard.",
      "2. Download and complete Form SB/16 (cover sheet) from USPTO.gov.",
      "3. Assemble your filing package in the order specified by the USPTO.",
      "4. Submit via EFS-Web at https://www.uspto.gov/efw (electronic filing recommended).",
      "5. Monitor your application status on Patents PAIR at https://portal.uspto.gov/pair.",
      "6. Retain copies of all submitted documents for your records.",
      "7. Consider consulting a patent attorney for non-provisional filing strategy.",
      "8. Your filing receipt will confirm priority date — critical for future international filings.",
    ];

    for (const step of nextsteps) {
      pdf.fontSize(11).font("Helvetica").fillColor("#333333").text(step, { lineGap: 3 });
      pdf.moveDown(0.4);
    }

    // Footer & watermarks
    const pageCount = pdf.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      pdf.switchToPage(i);

      // Watermark
      pdf.save();
      pdf.translate(PAGE_W / 2, PAGE_H / 2);
      pdf.rotate(-45);
      pdf.fontSize(60).font("Helvetica-Bold").fillColor("#f0f0f0").opacity(0.15)
        .text("IP SENTINEL", -200, -30, { align: "center" });
      pdf.restore();
      pdf.opacity(1);

      // Footer
      const footerY = PAGE_H - 35;
      pdf.moveTo(MARGIN, footerY - 5).lineTo(PAGE_W - MARGIN, footerY - 5).strokeColor("#e4e4e7").lineWidth(0.5).stroke();
      pdf.fontSize(8).font("Helvetica").fillColor("#999999");
      pdf.text("IP Sentinel™ — Filing Checklist", MARGIN, footerY, { width: 250 });
      pdf.text(`Page ${i + 1} of ${pageCount}`, PAGE_W - MARGIN - 60, footerY, { width: 60, align: "right" });
    }

    pdf.end();
  });
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Email template ──────────────────────────────────────────────────────
function generateEmailHTML(title: string, viewUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:20px;">
    <tr><td style="background-color:#ffffff;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="margin:0 0 24px;font-size:24px;color:#18181b;">🎉 Your Patent Draft is Ready!</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46;">
        Great news! Your provisional patent application draft for <strong>"${title}"</strong> has been generated and is ready for review.
      </p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#3f3f46;">Your draft includes:</p>
      <ul style="margin:0 0 24px;padding-left:24px;font-size:14px;line-height:1.8;color:#52525b;">
        <li>Abstract</li><li>Background of the Invention</li><li>Summary of the Invention</li>
        <li>Detailed Description</li><li>Patent Claims</li><li>Figure Descriptions</li>
      </ul>
      <a href="${viewUrl}" style="display:inline-block;padding:14px 28px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;font-size:16px;">View Your Patent Draft</a>
      <hr style="margin:32px 0;border:none;border-top:1px solid #e4e4e7;">
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;"><strong>What's Next?</strong></p>
      <ol style="margin:0 0 24px;padding-left:24px;font-size:14px;line-height:1.8;color:#71717a;">
        <li>Review each section of your draft carefully</li>
        <li>Download the PDF and DOCX for your records</li>
        <li>Consider having a patent attorney review before filing</li>
        <li>File with the USPTO within 12 months to maintain priority</li>
      </ol>
      <p style="margin:0;font-size:12px;color:#a1a1aa;">This is an AI-generated draft intended as a starting point. We strongly recommend professional review before filing.</p>
    </td></tr>
    <tr><td style="padding:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#a1a1aa;">IPGenie™ by IP Sentinel • Provisional Patent Generation</p></td></tr>
  </table>
</body></html>`;
}
