import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware, RateLimitPresets } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  const corsHeaders = getValidatedCorsHeaders(origin);

  try {
    // Rate limiting - apply before any processing
    const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.ai, undefined, corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    // Create authenticated client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    console.log("Authenticated user:", userId);

    const { filing_id } = await req.json();
    console.log("Generating filing for ID:", filing_id);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the filing
    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .select("*")
      .eq("id", filing_id)
      .single();

    if (filingError || !filing) {
      console.error("Filing not found:", filingError);
      return new Response(
        JSON.stringify({ error: "Filing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check ownership - user must own the filing or be admin
    if (filing.user_id !== userId) {
      // Check if user is admin
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (!adminCheck) {
        console.error("Unauthorized: User does not own this filing");
        return new Response(
          JSON.stringify({ error: "Unauthorized: You do not own this filing" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update queue status to processing
    await supabase
      .from("filing_queue")
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq("filing_id", filing_id);

    console.log("Processing filing:", filing.title, "Type:", filing.type);

    // Generate content based on filing type
    let generatedContent;
    try {
      generatedContent = await generateFilingContent(filing);
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      
      // Update queue with error
      await supabase
        .from("filing_queue")
        .update({ 
          status: 'failed',
          error_message: (aiError as any)?.message || 'AI generation failed',
          completed_at: new Date().toISOString()
        })
        .eq("filing_id", filing_id);

      // Update filing status
      await supabase
        .from("filings")
        .update({ status: 'error' })
        .eq("id", filing_id);

      throw aiError;
    }

    // Generate PDF document
    const pdfContent = await generatePDF(filing, generatedContent);
    
    // Upload to storage
    const fileName = `${filing_id}/filing_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('filings')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload document");
    }

    // Save document record
    await supabase
      .from("filing_documents")
      .insert({
        filing_id: filing_id,
        document_type: 'pdf',
        file_path: fileName,
        metadata: {
          size: pdfContent.length,
          generated_at: new Date().toISOString()
        }
      });

    // Update filing with generated content
    await supabase
      .from("filings")
      .update({ 
        status: 'ready',
        generated_content: generatedContent
      })
      .eq("id", filing_id);

    // Update queue status to completed
    await supabase
      .from("filing_queue")
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("filing_id", filing_id);

    // Create success notification
    await supabase
      .from("notifications")
      .insert({
        user_id: filing.user_id,
        filing_id: filing_id,
        type: 'success',
        title: 'Filing Ready',
        message: `Your ${filing.type} filing "${filing.title}" is ready for download!`
      });

    console.log("Successfully generated filing");

    return new Response(JSON.stringify({ 
      success: true,
      filing_id: filing_id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Generate filing error:", error);
    
    // Report to Sentry
    await captureException(error, {
      tags: { function: "generate-filing" },
      request: req,
    });
    
    return new Response(JSON.stringify({ error: 'Filing generation failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generateFilingContent(filing: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Generate AI content based on filing type
  let prompt = '';
  
  if (filing.type === 'patent') {
    prompt = `Act as a U.S. patent attorney. Generate a patent filing draft for:

Title: ${filing.title}
Problem: ${filing.problem}
Solution: ${filing.solution}
Components: ${JSON.stringify(filing.components)}
Country: ${filing.country}

Generate a complete patent draft including:
- Abstract (150 words max)
- Claims (at least 3 independent and 5 dependent claims)
- Background of Invention
- Summary of Invention
- Detailed Description
- Brief Description of Drawings (if applicable)

Format as JSON with these sections: abstract, claims, background, summary, detailed_description, drawings_description.`;
  } else if (filing.type === 'trademark') {
    prompt = `Act as a trademark attorney. Generate a trademark filing draft for:

Title: ${filing.title}
Description: ${filing.problem}
Use Case: ${filing.solution}
Country: ${filing.country}

Generate a complete trademark filing including:
- Trademark description
- Nice Classification classes (suggest appropriate classes)
- Goods and services description
- Use in commerce statement
- Risk assessment and potential conflicts

Format as JSON with these sections: description, nice_classes, goods_services, use_statement, risk_assessment.`;
  } else if (filing.type === 'copyright') {
    prompt = `Act as a copyright attorney. Generate a copyright filing draft for:

Title: ${filing.title}
Work Description: ${filing.problem}
Purpose: ${filing.solution}
Country: ${filing.country}

Generate a complete copyright filing including:
- Work description and classification
- Author information template
- Publication details
- Rights statement
- Registration basis

Format as JSON with these sections: work_description, classification, author_template, publication_details, rights_statement.`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert IP attorney. Generate professional, legally-sound filing content. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error("Failed to parse AI response as JSON:", content);
    throw new Error("Invalid AI response format");
  }
}

async function generatePDF(filing: any, content: any): Promise<Uint8Array> {
  // Simple PDF generation using basic text formatting
  const pdfContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${getContentLength(filing, content)}
>>
stream
BT
/F1 12 Tf
50 720 Td
(${filing.type.toUpperCase()} FILING: ${filing.title}) Tj
0 -30 Td
(Generated on: ${new Date().toDateString()}) Tj
0 -30 Td
(Country: ${filing.country}) Tj
0 -50 Td
(ABSTRACT:) Tj
0 -20 Td
(${content.abstract || content.description || 'Generated content will appear here'}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000283 00000 n 
0000000${String(400 + getContentLength(filing, content)).padStart(6, '0')} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${450 + getContentLength(filing, content)}
%%EOF`;

  return new TextEncoder().encode(pdfContent);
}

function getContentLength(filing: any, content: any): number {
  const textContent = `${filing.type.toUpperCase()} FILING: ${filing.title}
Generated on: ${new Date().toDateString()}
Country: ${filing.country}
ABSTRACT:
${content.abstract || content.description || 'Generated content will appear here'}`;
  return textContent.length + 100;
}
