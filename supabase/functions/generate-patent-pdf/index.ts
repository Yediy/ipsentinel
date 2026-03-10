import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.slice(7).trim();
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filing_id } = await req.json();
    if (!filing_id) {
      return new Response(
        JSON.stringify({ error: 'filing_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify ownership
    const { data: filing, error: filingError } = await supabase
      .from('filings')
      .select('*')
      .eq('id', filing_id)
      .eq('user_id', user.id)
      .single();

    if (filingError || !filing) {
      return new Response(
        JSON.stringify({ error: 'Filing not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate comprehensive HTML for PDF
    const htmlContent = generatePatentHTML(filing);
    
    // Convert to PDF using html-pdf-node-like approach
    // In production, use a proper PDF generation service
    const pdfBuffer = createPDFFromHTML(htmlContent, filing);

    // Upload to storage
    const fileName = `${filing_id}/provisional_patent_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('filings')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload PDF');
    }

    // Create signed URL for download
    const { data: signedUrl } = await supabase.storage
      .from('filings')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    // Record document
    await supabase
      .from('documents')
      .insert({
        filing_id,
        kind: 'pdf',
        url: fileName,
        delete_after: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      });

    console.log('PDF generated successfully for filing:', filing_id);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl?.signedUrl,
        file_path: fileName
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: 'PDF generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePatentHTML(filing: any): string {
  const generatedContent = filing.generated_content || {};
  const generatedAt = generatedContent.generated_at 
    ? new Date(generatedContent.generated_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Provisional Patent Application - ${escapeHtml(filing.title)}</title>
  <style>
    @page { margin: 1in; size: letter; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 6.5in;
      margin: 0 auto;
    }
    .cover-page {
      text-align: center;
      page-break-after: always;
      padding-top: 2in;
    }
    .cover-title {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2in;
    }
    .cover-subtitle {
      font-size: 14pt;
      margin-bottom: 1in;
    }
    .cover-meta {
      font-size: 12pt;
      margin-top: 1in;
    }
    .section {
      margin-bottom: 24pt;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 12pt;
      border-bottom: 1px solid #000;
      padding-bottom: 6pt;
    }
    .subsection-title {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 6pt;
    }
    .content {
      text-align: justify;
      white-space: pre-wrap;
    }
    .claim {
      margin: 12pt 0;
      padding-left: 24pt;
      text-indent: -24pt;
    }
    .claim-number {
      font-weight: bold;
    }
    .footer {
      font-size: 10pt;
      text-align: center;
      color: #666;
      margin-top: 48pt;
      border-top: 1px solid #ccc;
      padding-top: 12pt;
    }
    .disclaimer {
      font-size: 9pt;
      font-style: italic;
      color: #666;
      margin-top: 24pt;
      padding: 12pt;
      border: 1px solid #ccc;
      background: #f9f9f9;
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <div class="cover-title">${escapeHtml(filing.title)}</div>
    <div class="cover-subtitle">Provisional Patent Application</div>
    <div class="cover-meta">
      <p>Filed: ${generatedAt}</p>
      <p>Application Type: Provisional (12 months to file non-provisional)</p>
      ${generatedContent.tier ? `<p>Generation Tier: ${escapeHtml(generatedContent.tier)}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Abstract of the Disclosure</div>
    <div class="content">${escapeHtml(filing.abstract || 'Abstract not yet generated.')}</div>
  </div>

  <div class="section">
    <div class="section-title">Background of the Invention</div>
    <div class="subsection-title">Field of the Invention</div>
    <div class="content">The present invention relates generally to ${escapeHtml(filing.title?.toLowerCase() || 'the disclosed technology')}.</div>
    <div class="subsection-title">Description of the Related Art</div>
    <div class="content">${escapeHtml(filing.background || 'Background information not yet generated.')}</div>
  </div>

  <div class="section">
    <div class="section-title">Summary of the Invention</div>
    <div class="content">${escapeHtml(filing.summary || 'Summary not yet generated.')}</div>
  </div>

  <div class="section">
    <div class="section-title">Detailed Description of Preferred Embodiments</div>
    <div class="content">${escapeHtml(filing.detailed_description || 'Detailed description not yet generated.')}</div>
  </div>

  ${generatedContent.figure_descriptions ? `
  <div class="section">
    <div class="section-title">Brief Description of the Drawings</div>
    <div class="content">${escapeHtml(generatedContent.figure_descriptions)}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Claims</div>
    <div class="content">${formatClaims(filing.claims)}</div>
  </div>

  <div class="disclaimer">
    <strong>DISCLAIMER:</strong> This document was generated by IPGenie AI and is intended as a starting point for a provisional patent application. This document has NOT been reviewed by a registered patent attorney or agent. The applicant is strongly encouraged to consult with a qualified patent professional before filing with the USPTO. This provisional application establishes a priority date but does not result in an issued patent without filing a corresponding non-provisional application within 12 months.
  </div>

  <div class="footer">
    Generated by IPGenie™ • ${new Date().toLocaleDateString()} • For informational purposes only
  </div>
</body>
</html>`;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatClaims(claims: string | null): string {
  if (!claims) return 'Claims not yet generated.';
  
  // Try to detect if claims are already numbered
  const lines = claims.split('\n').filter(line => line.trim());
  let formatted = '';
  let claimNumber = 1;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line starts with a number
    const match = trimmed.match(/^(\d+)\.\s*(.*)/);
    if (match) {
      formatted += `<div class="claim"><span class="claim-number">${match[1]}.</span> ${escapeHtml(match[2])}</div>`;
    } else if (trimmed.toLowerCase().startsWith('claim')) {
      formatted += `<div class="claim"><span class="claim-number">${claimNumber}.</span> ${escapeHtml(trimmed)}</div>`;
      claimNumber++;
    } else {
      formatted += `<div class="claim">${escapeHtml(trimmed)}</div>`;
    }
  }
  
  return formatted || escapeHtml(claims);
}

function createPDFFromHTML(html: string, filing: any): Uint8Array {
  // Create a more complete PDF structure
  // In production, use a service like Puppeteer, wkhtmltopdf, or a PDF API
  
  const cleanText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000);

  const title = filing.title || 'Provisional Patent Application';
  const chunks = cleanText.match(/.{1,70}/g) || [cleanText];
  
  let textCommands = '';
  let yPos = 750;
  
  // Title
  textCommands += `BT /F1 16 Tf 72 ${yPos} Td (${sanitizePdfString(title)}) Tj ET\n`;
  yPos -= 30;
  textCommands += `BT /F1 10 Tf 72 ${yPos} Td (Provisional Patent Application) Tj ET\n`;
  yPos -= 40;
  
  // Content
  for (const chunk of chunks.slice(0, 50)) {
    if (yPos < 72) break;
    textCommands += `BT /F1 10 Tf 72 ${yPos} Td (${sanitizePdfString(chunk)}) Tj ET\n`;
    yPos -= 14;
  }
  
  const streamContent = textCommands;
  const streamLength = streamContent.length;

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >> stream
${streamContent}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(330 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

  return new TextEncoder().encode(pdf);
}

function sanitizePdfString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}
