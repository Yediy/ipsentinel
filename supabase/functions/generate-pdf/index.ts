import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filing_id, content_type = 'patent' } = await req.json();
    console.log("Generating PDF for filing:", filing_id, "Type:", content_type);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get filing data and generated content
    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .select("*")
      .eq("id", filing_id)
      .single();

    if (filingError || !filing) {
      throw new Error("Filing not found");
    }

    // Generate HTML content based on filing type
    let htmlContent;
    if (content_type === 'patent') {
      htmlContent = generatePatentHTML(filing);
    } else if (content_type === 'trademark') {
      htmlContent = generateTrademarkHTML(filing);
    } else if (content_type === 'copyright') {
      htmlContent = generateCopyrightHTML(filing);
    } else {
      throw new Error("Unsupported content type");
    }

    // Convert HTML to PDF using basic approach (would use Puppeteer in production)
    const pdfBuffer = await convertHTMLToPDF(htmlContent);

    // Upload to storage
    const fileName = `${filing_id}/${content_type}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('filings')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      throw new Error("Failed to upload PDF");
    }

    // Save document record
    await supabase
      .from("filing_documents")
      .insert({
        filing_id: filing_id,
        document_type: 'pdf',
        file_path: fileName,
        metadata: {
          size: pdfBuffer.length,
          generated_at: new Date().toISOString(),
          content_type: content_type
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      file_path: fileName,
      download_url: `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/filings/${fileName}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return new Response(JSON.stringify({ error: error?.message || 'PDF generation failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generatePatentHTML(filing: any): string {
  const content = filing.generated_content || {};
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${filing.title}</title>
    <style>
        body { 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt; 
            line-height: 1.6; 
            margin: 1in;
            color: #000;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .title { 
            font-size: 16pt; 
            font-weight: bold; 
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .section { 
            margin: 25px 0; 
            page-break-inside: avoid;
        }
        .section-title { 
            font-size: 14pt; 
            font-weight: bold; 
            margin-bottom: 15px;
            text-decoration: underline;
        }
        .claim { 
            margin: 15px 0; 
            padding-left: 20px;
        }
        .claim-number { 
            font-weight: bold; 
        }
        .field-title { 
            font-weight: bold; 
            margin-top: 20px;
        }
        .page-break { 
            page-break-before: always; 
        }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 10pt;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${filing.title}</div>
        <div>United States Patent Application</div>
        <div>Filed: ${new Date(filing.created_at).toLocaleDateString()}</div>
        <div>Inventor(s): ${content.inventors || 'Not specified'}</div>
    </div>

    <div class="section">
        <div class="section-title">ABSTRACT</div>
        <p>${content.abstract || 'Abstract not available'}</p>
    </div>

    <div class="section">
        <div class="section-title">BACKGROUND OF THE INVENTION</div>
        <div class="field-title">Field of the Invention</div>
        <p>The present invention relates to ${filing.title.toLowerCase()}.</p>
        
        <div class="field-title">Description of the Prior Art</div>
        <p>${content.background || filing.problem || 'Background information not available'}</p>
    </div>

    <div class="section">
        <div class="section-title">SUMMARY OF THE INVENTION</div>
        <p>${content.summary || filing.solution || 'Summary not available'}</p>
    </div>

    <div class="section page-break">
        <div class="section-title">DETAILED DESCRIPTION OF THE INVENTION</div>
        <p>${content.detailed_description || 'Detailed description not available'}</p>
    </div>

    <div class="section page-break">
        <div class="section-title">CLAIMS</div>
        ${content.claims ? content.claims.map((claim: string, index: number) => 
          `<div class="claim">
             <span class="claim-number">${index + 1}.</span> 
             ${claim}
           </div>`
        ).join('') : '<p>Claims not available</p>'}
    </div>

    ${content.drawings_description ? `
    <div class="section page-break">
        <div class="section-title">BRIEF DESCRIPTION OF THE DRAWINGS</div>
        <p>${content.drawings_description}</p>
    </div>
    ` : ''}

    <div class="footer">
        Generated by IPGenie™ - ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;
}

function generateTrademarkHTML(filing: any): string {
  const content = filing.generated_content || {};
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Trademark Application - ${filing.title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt; 
            line-height: 1.5; 
            margin: 1in;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 1px solid #333;
            padding-bottom: 15px;
        }
        .form-section { 
            margin: 20px 0; 
            border: 1px solid #ccc;
            padding: 15px;
        }
        .form-title { 
            font-weight: bold; 
            background: #f5f5f5;
            margin: -15px -15px 15px -15px;
            padding: 10px 15px;
        }
        .field { 
            margin: 10px 0; 
        }
        .field-label { 
            font-weight: bold; 
            display: inline-block;
            width: 200px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>TRADEMARK/SERVICE MARK APPLICATION</h1>
        <p>PRINCIPAL REGISTER</p>
    </div>

    <div class="form-section">
        <div class="form-title">APPLICANT INFORMATION</div>
        <div class="field">
            <span class="field-label">Mark:</span>
            ${filing.title}
        </div>
        <div class="field">
            <span class="field-label">Filing Date:</span>
            ${new Date(filing.created_at).toLocaleDateString()}
        </div>
    </div>

    <div class="form-section">
        <div class="form-title">MARK INFORMATION</div>
        <div class="field">
            <span class="field-label">Mark Type:</span>
            Word Mark
        </div>
        <div class="field">
            <span class="field-label">Description:</span>
            ${content.description || filing.solution || 'Description not provided'}
        </div>
    </div>

    <div class="form-section">
        <div class="form-title">GOODS AND SERVICES</div>
        <div class="field">
            <span class="field-label">Classification:</span>
            ${content.nice_classes || 'Class to be determined'}
        </div>
        <div class="field">
            <span class="field-label">Goods/Services:</span>
            ${content.goods_services || filing.problem || 'To be specified'}
        </div>
    </div>

    <div class="form-section">
        <div class="form-title">USE STATEMENT</div>
        <p>${content.use_statement || 'Use statement to be provided'}</p>
    </div>
</body>
</html>`;
}

function generateCopyrightHTML(filing: any): string {
  const content = filing.generated_content || {};
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Copyright Registration - ${filing.title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt; 
            margin: 1in;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
        }
        .section { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid #ddd;
        }
        .section-title { 
            font-weight: bold; 
            font-size: 12pt;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>COPYRIGHT REGISTRATION APPLICATION</h1>
        <h2>FORM CO</h2>
    </div>

    <div class="section">
        <div class="section-title">WORK INFORMATION</div>
        <p><strong>Title:</strong> ${filing.title}</p>
        <p><strong>Work Classification:</strong> ${content.classification || 'Literary Work'}</p>
        <p><strong>Description:</strong> ${content.work_description || filing.solution || 'Work description not provided'}</p>
    </div>

    <div class="section">
        <div class="section-title">AUTHOR INFORMATION</div>
        <p>${content.author_template || 'Author information to be completed'}</p>
    </div>

    <div class="section">
        <div class="section-title">PUBLICATION DETAILS</div>
        <p>${content.publication_details || 'Publication details to be provided'}</p>
    </div>

    <div class="section">
        <div class="section-title">RIGHTS STATEMENT</div>
        <p>${content.rights_statement || 'Rights statement to be completed'}</p>
    </div>
</body>
</html>`;
}

async function convertHTMLToPDF(html: string): Promise<Uint8Array> {
  // In production, this would use Puppeteer
  // For now, we'll create a basic PDF structure
  const pdfHeader = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${html.length + 100} >>
stream
BT
/F1 12 Tf
50 720 Td
(${html.replace(/<[^>]*>/g, '').substring(0, 500)}) Tj
ET
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000230 00000 n 
0000000${(400 + html.length).toString().padStart(6, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${450 + html.length}
%%EOF`;

  return new TextEncoder().encode(pdfHeader);
}