import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  const corsHeaders = getValidatedCorsHeaders(origin);

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create authenticated client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Auth validation failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    const { 
      filing_id,
      title, 
      abstract, 
      detailed_description, 
      features, 
      claims, 
      prior_art 
    } = await req.json();

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If filing_id provided, verify ownership
    if (filing_id) {
      const { data: filing, error: filingError } = await supabase
        .from('filings')
        .select('user_id')
        .eq('id', filing_id)
        .single();

      if (filingError || !filing) {
        return new Response(
          JSON.stringify({ error: 'Filing not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check ownership - user must own the filing or be admin
      if (filing.user_id !== userId) {
        const { data: adminCheck } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();

        if (!adminCheck) {
          console.error('Unauthorized: User does not own this filing');
          return new Response(
            JSON.stringify({ error: 'Unauthorized: You do not own this filing' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Initialize OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating patent with AI...');

    // Enhanced prompt for USPTO-compliant patent generation
    const prompt = `You are an expert USPTO patent attorney. Generate a complete, professionally formatted patent application using the following information:

**Invention Details:**
Title: ${title}
Abstract: ${abstract}
Description: ${detailed_description}
Key Features: ${features}
Claims: ${claims}
Prior Art: ${prior_art}

**Instructions:**
Create a complete patent application with these sections in proper USPTO format:

1. **TITLE OF THE INVENTION**
2. **CROSS-REFERENCE TO RELATED APPLICATIONS** (if applicable)
3. **FIELD OF THE INVENTION**
4. **BACKGROUND OF THE INVENTION**
5. **SUMMARY OF THE INVENTION**
6. **BRIEF DESCRIPTION OF THE DRAWINGS** (if applicable)
7. **DETAILED DESCRIPTION OF THE INVENTION**
8. **CLAIMS**

**Requirements:**
- Use proper patent language and technical terminology
- Include at least 1 independent claim and 3-5 dependent claims
- Ensure claims are clear, concise, and patentable
- Follow USPTO formatting guidelines
- Make the application professionally comprehensive
- Include technical specifications and embodiments

Generate the complete patent application document:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert USPTO patent attorney specializing in drafting professional patent applications that comply with all USPTO requirements and formatting standards.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate patent content');
    }

    const aiResponse = await response.json();
    const patentContent = aiResponse.choices[0].message.content;

    console.log('Patent content generated successfully');

    // Generate HTML template for PDF conversion
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Patent Application - ${title}</title>
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
                border-bottom: 2px solid #000;
                padding-bottom: 20px;
            }
            .title {
                font-size: 16pt;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 10px;
            }
            .section-header {
                font-weight: bold;
                font-size: 14pt;
                margin-top: 25px;
                margin-bottom: 15px;
                text-decoration: underline;
            }
            .claim {
                margin-bottom: 10px;
                text-indent: -20px;
                margin-left: 20px;
            }
            .watermark {
                position: fixed;
                bottom: 20px;
                right: 20px;
                font-size: 10pt;
                color: #666;
                z-index: 1000;
            }
            pre {
                white-space: pre-wrap;
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">${title}</div>
            <div>Patent Application</div>
            <div>Generated by IPGenie AI</div>
            <div style="font-size: 10pt; margin-top: 10px;">
                Date: ${new Date().toLocaleDateString()}
            </div>
        </div>
        
        <div class="content">
            <pre>${patentContent}</pre>
        </div>
        
        <div class="watermark">
            IPGenie.ai - AI Patent Drafting
        </div>
    </body>
    </html>`;

    return new Response(
      JSON.stringify({
        success: true,
        patent_content: patentContent,
        html_content: htmlContent,
        title: title,
        generated_at: new Date().toISOString(),
        sections: {
          title,
          abstract,
          detailed_description,
          features,
          claims,
          prior_art
        }
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Error in generate-patent function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate patent',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          ...getValidatedCorsHeaders(req.headers.get('origin')), 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
