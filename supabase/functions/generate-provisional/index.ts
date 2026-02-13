import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import PDFDocument from "https://esm.sh/pdfkit@0.13.0";
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

// ── Main handler ────────────────────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") return createCorsPreflightResponse(origin);

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

    // Get intake data
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("*")
      .eq("id", intakeId)
      .single();

    if (intakeError || !intake) throw new Error("Intake not found");

    // ── Transition: paid/generating → generating ──────────────────────
    await supabase.from("intakes").update({ status: "generating" }).eq("id", intakeId);

    // Create / update generation job
    const { data: job } = await supabase
      .from("generation_jobs")
      .upsert(
        { intake_id: intakeId, status: "running", attempts: 1 },
        { onConflict: "intake_id" }
      )
      .select("id")
      .single();

    const answers = intake.answers_json as IntakeAnswers;

    // ── Generate all sections ─────────────────────────────────────────
    const sectionKeys = [
      "title", "abstract", "background", "summary",
      "detailed_description", "claims", "figure_descriptions",
    ];
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

    // ── Update filing with generated content ──────────────────────────
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

    // ── Generate PDF and DOCX files ───────────────────────────────────────
    const userId = intake.user_id;
    const deleteAfter = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Build spec text for documents
    const specText = [
      `TITLE: ${generatedContent.title || answers.title}`,
      "",
      "ABSTRACT",
      generatedContent.abstract,
      "",
      "BACKGROUND",
      generatedContent.background,
      "",
      "SUMMARY",
      generatedContent.summary,
      "",
      "DETAILED DESCRIPTION",
      generatedContent.detailed_description,
      "",
      "CLAIMS",
      generatedContent.claims,
      "",
      "FIGURE DESCRIPTIONS",
      generatedContent.figure_descriptions,
    ].join("\n");

    // Generate PDF using PDFKit
    const pdfBuffer = await generatePDF(generatedContent, answers.title || "Patent Specification");
    const pdfKey = storageKey(userId, intakeId, "spec_pdf", "pdf");
    
    await supabase.storage
      .from("filings")
      .upload(pdfKey, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    // Generate DOCX using simple HTML-to-Word conversion
    const docxBuffer = await generateDocx(generatedContent, answers.title || "Patent Specification");
    const docxKey = storageKey(userId, intakeId, "spec_docx", "docx");
    
    await supabase.storage
      .from("filings")
      .upload(docxKey, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    // Record documents
    const docRecords = [
      {
        filing_id: filingId,
        intake_id: intakeId,
        kind: "pdf" as const,
        doc_type: "spec_pdf",
        storage_key: pdfKey,
        url: pdfKey,
        delete_after: deleteAfter,
      },
      {
        filing_id: filingId,
        intake_id: intakeId,
        kind: "docx" as const,
        doc_type: "spec_docx",
        storage_key: docxKey,
        url: docxKey,
        delete_after: deleteAfter,
      },
    ];

    await supabase.from("documents").insert(docRecords);

    // ── Transition: generating → ready ────────────────────────────────
    await supabase.from("intakes").update({ status: "ready" }).eq("id", intakeId);

    // Update generation job
    if (job) {
      await supabase
        .from("generation_jobs")
        .update({ status: "succeeded" })
        .eq("id", job.id);
    }

    // ── Notifications ─────────────────────────────────────────────────
    await supabase.rpc("notify_user", {
      p_user_id: intake.user_id,
      p_filing_id: filingId,
      p_subject: "Patent Draft Ready",
      p_body: "Your provisional patent draft is ready for review.",
    });

    // Send email notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", intake.user_id)
      .single();

    if (profile?.email) {
      const viewUrl = `https://ipsentinel.lovable.app/patent/${filingId}`;
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/email-sender`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            to: profile.email,
            subject: "Your Provisional Patent Draft is Ready!",
            html: generateEmailHTML(answers.title || generatedContent.title, viewUrl),
            filing_id: filingId,
            notification_type: "patent_ready",
          }),
        });
        console.log("Email notification sent to:", profile.email);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    console.log("Generation complete for filing:", filingId);

    return new Response(
      JSON.stringify({ success: true, filing_id: filingId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Generation error:", error);

    // ── On failure: transition to failed ──────────────────────────────
    if (intakeId) {
      await supabase.from("intakes").update({ status: "failed" }).eq("id", intakeId);
      await supabase
        .from("generation_jobs")
        .update({ status: "failed", last_error: error?.message || "Unknown error" })
        .eq("intake_id", intakeId)
        .eq("status", "running");
    }

    await captureException(error, { tags: { function: "generate-provisional" }, request: req });

    return new Response(
      JSON.stringify({ error: error?.message || "Generation failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ── PDF generation helper ────────────────────────────────────────────────
async function generatePDF(
  content: Record<string, string>,
  title: string
): Promise<Uint8Array> {
  const pdf = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true
  });

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    pdf.on("end", () => {
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(buffer);
    });
    pdf.on("error", reject);

    // Add title
    pdf.fontSize(24).font("Helvetica-Bold").text(title, { align: "center" });
    pdf.moveDown(0.5);
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke();
    pdf.moveDown(1);

    // Add sections
    const sections = ["abstract", "background", "summary", "detailed_description", "claims", "figure_descriptions"];
    const sectionLabels: Record<string, string> = {
      abstract: "Abstract",
      background: "Background of the Invention",
      summary: "Summary of the Invention",
      detailed_description: "Detailed Description",
      claims: "Claims",
      figure_descriptions: "Figure Descriptions"
    };

    for (const section of sections) {
      if (content[section]) {
        pdf.fontSize(14).font("Helvetica-Bold").text(sectionLabels[section] || section);
        pdf.fontSize(11).font("Helvetica").text(content[section], { align: "justify" });
        pdf.moveDown(0.5);
      }
    }

    pdf.end();
  });
}

// ── DOCX generation helper ────────────────────────────────────────────────
async function generateDocx(
  content: Record<string, string>,
  title: string
): Promise<Uint8Array> {
  // Create a basic DOCX structure
  const sections = [
    { key: "abstract", label: "Abstract" },
    { key: "background", label: "Background of the Invention" },
    { key: "summary", label: "Summary of the Invention" },
    { key: "detailed_description", label: "Detailed Description" },
    { key: "claims", label: "Claims" },
    { key: "figure_descriptions", label: "Figure Descriptions" }
  ];

  let docContent = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:t>${escapeXml(title)}</w:t></w:r>
    </w:p>`;

  for (const section of sections) {
    if (content[section.key]) {
      docContent += `
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${escapeXml(section.label)}</w:t></w:r>
    </w:p>`;
      
      const paragraphs = content[section.key].split("\n\n");
      for (const para of paragraphs) {
        docContent += `
    <w:p>
      <w:r><w:t>${escapeXml(para)}</w:t></w:r>
    </w:p>`;
      }
    }
  }

  docContent += `
  </w:body>
</w:document>`;

  return new TextEncoder().encode(docContent);
}

function escapeXml(str: string): string {
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
        <li>Download the PDF for your records</li>
        <li>Consider having a patent attorney review before filing</li>
        <li>File with the USPTO within 12 months to maintain priority</li>
      </ol>
      <p style="margin:0;font-size:12px;color:#a1a1aa;">This is an AI-generated draft intended as a starting point. We strongly recommend professional review before filing.</p>
    </td></tr>
    <tr><td style="padding:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#a1a1aa;">IPGenie™ by IP Sentinel • Provisional Patent Generation</p></td></tr>
  </table>
</body></html>`;
}
