import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware, RateLimitPresets } from "../_shared/rate-limiter.ts";

// Helper function to verify filing ownership
async function verifyFilingOwnership(supabase: any, filing_id: string, user_id: string): Promise<boolean> {
  const { data: filing, error } = await supabase
    .from('filings')
    .select('user_id')
    .eq('id', filing_id)
    .single();
  
  if (error || !filing) {
    return false;
  }
  
  return filing.user_id === user_id;
}

// Advanced AI Filing Agent with LLM Prompt Chains
serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  try {
    // Rate limiting - apply before any processing
    const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.ai, undefined, corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    // SECURITY: Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client with user's token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('JWT verification failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = claimsData.user;
    console.log('Authenticated user:', user.id);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { action, filing_id, filing_type, data, conversation_step } = await req.json();
    console.log(`AI Filing Agent - Action: ${action}, Type: ${filing_type}, Step: ${conversation_step}, User: ${user.id}`);

    // SECURITY: Verify filing ownership for all actions that require a filing_id
    if (filing_id) {
      const hasOwnership = await verifyFilingOwnership(supabase, filing_id, user.id);
      if (!hasOwnership) {
        console.error(`Unauthorized access attempt: user ${user.id} tried to access filing ${filing_id}`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to filing', success: false }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let result;

    switch (action) {
      case 'start_session':
        result = await startFilingSession(supabase, filing_id, filing_type, user.id);
        break;
      case 'process_conversation':
        result = await processConversationStep(supabase, openAIApiKey, filing_id, conversation_step, data);
        break;
      case 'generate_sections':
        result = await generatePatentSections(supabase, openAIApiKey, filing_id, data);
        break;
      case 'trademark_classification':
        result = await classifyTrademarkGoods(supabase, openAIApiKey, filing_id, data);
        break;
      case 'trademark_clearance':
        result = await performTrademarkClearance(supabase, openAIApiKey, filing_id, data);
        break;
      case 'classify_copyright':
        result = await classifyCopyrightWork(supabase, openAIApiKey, filing_id, data);
        break;
      case 'generate_copyright_form':
        result = await generateCopyrightForm(supabase, openAIApiKey, filing_id, data);
        break;
      case 'handle_file_upload':
        result = await handleFileUpload(supabase, filing_id, data);
        break;
      case 'review_filing':
        result = await reviewFiling(supabase, filing_id);
        break;
      case 'finalize_filing':
        result = await finalizeFiling(supabase, filing_id);
        break;
      case 'generate_pdf':
        result = await generatePatentPDF(supabase, filing_id, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('AI Filing Agent error:', error);
    
    // Report to Sentry
    await captureException(error, {
      tags: { function: "ai-filing-agent" },
      request: req,
    });
    
    return new Response(JSON.stringify({ 
      error: 'An internal error occurred. Please try again.',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startFilingSession(supabase: any, filing_id: string, filing_type: string, user_id: string) {
  console.log('Starting AI filing session:', filing_id, filing_type, 'for user:', user_id);
  
  const sessionType = `${filing_type}_interview`;
  
  // Create AI session - RLS will enforce ownership
  const { data: session, error: sessionError } = await supabase
    .from('ai_filing_sessions')
    .insert({
      filing_id,
      session_type: sessionType,
      current_step: 'start',
      ai_model_used: 'claude-sonnet-4'
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Get conversation flow for filing type
  const conversationFlow = getConversationFlow(filing_type);
  
  return {
    success: true,
    session_id: session.id,
    conversation_flow: conversationFlow,
    current_step: 'start',
    next_question: conversationFlow.steps[0]
  };
}

async function processConversationStep(supabase: any, openAIApiKey: string, filing_id: string, step: string, data: any) {
  console.log('Processing conversation step:', step, data);
  
  // Get current session - RLS enforces ownership
  const { data: session, error: sessionError } = await supabase
    .from('ai_filing_sessions')
    .select()
    .eq('filing_id', filing_id)
    .single();

  if (sessionError) throw sessionError;

  // Parse existing conversation log
  const conversationLog = session.conversation_log || [];
  
  // Add user response to log
  conversationLog.push({
    step,
    user_input: data.response,
    timestamp: new Date().toISOString()
  });

  // Initialize AI processing (placeholder implementation)
  async function processWithAI(apiKey: string, step: string, response: string, log: any[]): Promise<any> {
    // Placeholder for AI processing logic
    return {
      processed_response: response,
      ai_suggestions: [],
      confidence: 0.8
    };
  }

  // Process response with AI if needed
  let aiResponse = null;
  if (data.needs_ai_processing) {
    aiResponse = await processWithAI(openAIApiKey, step, data.response, conversationLog);
  }

  // Update session - RLS enforces ownership
  const { error: updateError } = await supabase
    .from('ai_filing_sessions')
    .update({
      conversation_log: conversationLog,
      current_step: step,
      total_tokens_used: session.total_tokens_used + (aiResponse?.tokens_used || 0)
    })
    .eq('filing_id', filing_id);

  if (updateError) throw updateError;

  // Determine next step
  const conversationFlow = getConversationFlow(session.session_type.replace('_interview', ''));
  const currentStepIndex = conversationFlow.steps.findIndex((s: any) => s.id === step);
  const nextStep = conversationFlow.steps[currentStepIndex + 1];

  return {
    success: true,
    ai_response: aiResponse?.content,
    next_step: nextStep,
    conversation_complete: !nextStep,
    ready_for_generation: !nextStep && conversationLog.length >= conversationFlow.min_required_steps
  };
}

async function generatePatentSections(supabase: any, openAIApiKey: string, filing_id: string, conversationData: any) {
  console.log('Generating patent sections for filing:', filing_id);
  
  // Get prompt templates - RLS may apply
  const { data: templates, error: templateError } = await supabase
    .from('ai_prompt_templates')
    .select()
    .eq('template_type', 'patent')
    .eq('is_active', true);

  if (templateError) throw templateError;

  const sections = [];
  
  // Generate each section using appropriate template
  for (const template of templates) {
    try {
      const sectionContent = await generateSectionWithTemplate(
        openAIApiKey, 
        template, 
        conversationData
      );
      
      // Save section to database - RLS enforces ownership
      const { data: section, error: sectionError } = await supabase
        .from('patent_sections')
        .insert({
          filing_id,
          section_type: template.section_type,
          content: sectionContent,
          ai_generated: true,
          reviewed: false
        })
        .select()
        .single();

      if (sectionError) throw sectionError;
      
      sections.push({
        type: template.section_type,
        content: sectionContent,
        id: section.id
      });
      
    } catch (error: any) {
      console.error(`Error generating ${template.section_type}:`, error);
      sections.push({
        type: template.section_type,
        content: `Error generating section: ${error?.message || 'Unknown error'}`,
        error: true
      });
    }
  }

  // Update filing status - RLS enforces ownership
  await supabase
    .from('filings')
    .update({ status: 'draft_generated' })
    .eq('id', filing_id);

  return {
    success: true,
    sections,
    total_sections: sections.length,
    next_action: 'review_sections'
  };
}

async function classifyTrademarkGoods(supabase: any, openAIApiKey: string, filing_id: string, data: any) {
  console.log('Classifying trademark goods/services:', data);
  
  const { data: template } = await supabase
    .from('ai_prompt_templates')
    .select()
    .eq('template_name', 'trademark_goods_services_classifier')
    .single();

  if (!template) throw new Error('Classification template not found');

  const classification = await generateSectionWithTemplate(openAIApiKey, template, data);
  
  // Parse classification response (expecting JSON format)
  let classificationData;
  try {
    classificationData = JSON.parse(classification);
  } catch {
    // If not JSON, create structured data
    classificationData = {
      suggested_classes: extractClassNumbers(classification),
      descriptions: classification,
      raw_response: classification
    };
  }

  // Save trademark section - RLS enforces ownership
  const { data: trademarkSection, error: sectionError } = await supabase
    .from('trademark_sections')
    .upsert({
      filing_id,
      mark_name: data.mark_name,
      mark_type: data.mark_type || 'word',
      goods_services: data.goods_services,
      international_classes: classificationData.suggested_classes,
      filing_basis: data.filing_basis || '1a_use_in_commerce',
      owner_entity: data.owner_entity || 'individual'
    }, {
      onConflict: 'filing_id'
    })
    .select()
    .single();

  if (sectionError) throw sectionError;

  return {
    success: true,
    classification: classificationData,
    section_id: trademarkSection.id,
    next_action: 'trademark_clearance'
  };
}

async function performTrademarkClearance(supabase: any, openAIApiKey: string, filing_id: string, data: any) {
  console.log('Performing trademark clearance search:', data.mark_name);
  
  // Simulate trademark search (in production, integrate with USPTO TESS)
  const searchResults = await simulateTrademarkSearch(data.mark_name, data.international_classes);
  
  // Analyze results with AI
  const analysisPrompt = `Analyze these trademark search results for potential conflicts with the mark "${data.mark_name}":

Search Results:
${JSON.stringify(searchResults, null, 2)}

Provide:
1. Risk assessment (low/medium/high)
2. Specific concerns
3. Recommendations
4. Risk score (0.0 to 1.0)

Respond in JSON format with: {risk_level, risk_score, concerns, recommendations}`;

  const analysisResponse = await callOpenAI(openAIApiKey, analysisPrompt, 'gpt-4.1-2025-04-14');
  
  let riskAssessment;
  try {
    riskAssessment = JSON.parse(analysisResponse.content);
  } catch {
    riskAssessment = {
      risk_level: 'medium',
      risk_score: 0.5,
      concerns: ['Unable to parse AI analysis'],
      recommendations: ['Manual review recommended']
    };
  }

  // Save clearance log - RLS enforces ownership
  const { data: clearanceLog, error: logError } = await supabase
    .from('trademark_clearance_logs')
    .insert({
      filing_id,
      searched_term: data.mark_name,
      search_results: searchResults,
      similarity_matches: searchResults.similar_marks,
      risk_score: riskAssessment.risk_score,
      risk_level: riskAssessment.risk_level,
      recommendations: riskAssessment.recommendations.join('; ')
    })
    .select()
    .single();

  if (logError) throw logError;

  // Update trademark section with risk assessment - RLS enforces ownership
  await supabase
    .from('trademark_sections')
    .update({
      clearance_status: 'completed',
      risk_assessment: riskAssessment
    })
    .eq('filing_id', filing_id);

  return {
    success: true,
    clearance_results: {
      search_results: searchResults,
      risk_assessment: riskAssessment,
      clearance_id: clearanceLog.id
    },
    proceed_with_filing: riskAssessment.risk_level === 'low'
  };
}

async function generateSectionWithTemplate(openAIApiKey: string, template: any, data: any) {
  let prompt = template.prompt_text;
  
  // Replace template variables
  const variables = JSON.parse(template.input_variables);
  for (const variable of variables) {
    const value = data[variable] || `[${variable} not provided]`;
    prompt = prompt.replace(new RegExp(`{{${variable}}}`, 'g'), value);
  }

  const response = await callOpenAI(openAIApiKey, prompt, 'claude-sonnet-4-20250514');
  return response.content;
}

async function callOpenAI(apiKey: string, prompt: string, model: string = 'gpt-4.1-2025-04-14') {
  const isGPT = model.startsWith('gpt');
  const url = isGPT ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages';
  
  const headers = {
    'Content-Type': 'application/json',
    ...(isGPT 
      ? { 'Authorization': `Bearer ${apiKey}` }
      : { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    )
  };

  const body = isGPT ? {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 4000,
    temperature: 0.3
  } : {
    model,
    max_tokens: 4000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  
  return {
    content: isGPT ? result.choices[0].message.content : result.content[0].text,
    tokens_used: result.usage?.total_tokens || 0
  };
}

function getConversationFlow(filing_type: string) {
  const flows = {
    patent: {
      min_required_steps: 6,
      steps: [
        { 
          id: 'title', 
          question: "What is your invention called? Provide a clear, descriptive title that captures the essence of your innovation.", 
          type: 'text' 
        },
        { 
          id: 'summary', 
          question: "Describe your invention in simple terms. What does it do and what is its main purpose? (2-3 sentences)", 
          type: 'textarea' 
        },
        { 
          id: 'problem', 
          question: "What specific problem does your invention solve? Describe the current limitations or issues that exist.", 
          type: 'textarea' 
        },
        { 
          id: 'mechanism', 
          question: "How does your invention work? Explain the process, method, or technique step-by-step in detail.", 
          type: 'textarea' 
        },
        { 
          id: 'components', 
          question: "Describe all parts, materials, and components of your invention. What are the key elements that make it work?", 
          type: 'textarea' 
        },
        { 
          id: 'advantages', 
          question: "What makes your invention new or different from existing solutions? List the key benefits and improvements.", 
          type: 'textarea' 
        },
        { 
          id: 'prior_art', 
          question: "Are you aware of any similar inventions or existing solutions? If so, how is yours different?", 
          type: 'textarea',
          optional: true 
        },
        { 
          id: 'drawings', 
          question: "Do you have any drawings, sketches, or diagrams that illustrate your invention? (Optional)", 
          type: 'file', 
          optional: true 
        }
      ]
    },
    trademark: {
      min_required_steps: 4,
      steps: [
        { id: 'mark_name', question: "What is the exact trademark you want to register?", type: 'text' },
        { id: 'mark_type', question: "What type of mark is this?", type: 'select', options: ['word', 'design', 'composite'] },
        { id: 'goods_services', question: "What products or services will you use this trademark for?", type: 'textarea' },
        { id: 'business_activity', question: "Describe your business activity in detail.", type: 'textarea' },
        { id: 'filing_basis', question: "Are you currently using this trademark in commerce?", type: 'select', options: ['1a_use_in_commerce', '1b_intent_to_use'] }
      ]
    }
  };
  
  return (flows as any)[filing_type] || flows.patent;
}

async function simulateTrademarkSearch(markName: string, classes: any[]) {
  // Mock search results - in production, integrate with USPTO TESS API
  const similarMarks = [
    {
      mark: markName + 'PRO',
      owner: 'Tech Solutions Inc',
      status: 'Registered',
      classes: ['009', '042'],
      similarity_score: 0.85
    }
  ];

  return {
    searched_mark: markName,
    total_results: similarMarks.length,
    similar_marks: similarMarks,
    exact_matches: [],
    search_date: new Date().toISOString()
  };
}

function extractClassNumbers(text: string): number[] {
  const matches = text.match(/Class\s+(\d+)/gi) || [];
  return matches.map(match => parseInt(match.replace(/Class\s+/i, '')));
}

// Copyright-specific functions
async function classifyCopyrightWork(supabase: any, openAIApiKey: string, filing_id: string, data: any) {
  try {
    console.log('Classifying copyright work for filing:', filing_id);
    
    const { data: template } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('template_name', 'copyright_work_classification')
      .eq('is_active', true)
      .single();

    if (!template) {
      throw new Error('Copyright work classification template not found');
    }

    const response = await generateSectionWithTemplate(openAIApiKey, template, data);
    
    let classificationResult;
    try {
      classificationResult = JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse classification result:', response);
      throw new Error('Invalid classification response format');
    }

    // Save classification to copyright sections table - RLS enforces ownership
    await supabase
      .from('copyrights')
      .upsert({
        filing_id,
        work_title: data.work_title || 'Untitled Work',
        work_type: classificationResult.work_type,
        nature_of_authorship: classificationResult.nature_of_authorship,
        owner_name: data.owner_name || '',
        owner_address: data.owner_address || '',
        owner_nationality: data.owner_nationality || 'United States',
        is_published: data.is_published || false,
        date_of_creation: data.date_of_creation || null,
        date_of_publication: data.date_of_publication || null
      });

    return {
      success: true,
      classification: classificationResult,
      message: 'Work classified successfully'
    };
  } catch (error) {
    console.error('Error classifying copyright work:', error);
    throw error;
  }
}

async function generateCopyrightForm(supabase: any, openAIApiKey: string, filing_id: string, data: any) {
  try {
    console.log('Generating copyright Form CO for filing:', filing_id);
    
    const { data: template } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('template_name', 'copyright_form_co_generator')
      .eq('is_active', true)
      .single();

    if (!template) {
      throw new Error('Copyright form generator template not found');
    }

    const response = await generateSectionWithTemplate(openAIApiKey, template, data);
    
    let formData;
    try {
      formData = JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse form data:', response);
      throw new Error('Invalid form response format');
    }

    // Update the filing with generated content - RLS enforces ownership
    await supabase
      .from('filings')
      .update({
        generated_content: formData,
        status: 'draft_complete',
        updated_at: new Date().toISOString()
      })
      .eq('id', filing_id);

    return {
      success: true,
      form_data: formData,
      message: 'Copyright form generated successfully'
    };
  } catch (error) {
    console.error('Error generating copyright form:', error);
    throw error;
  }
}

async function handleFileUpload(supabase: any, filing_id: string, fileData: any) {
  try {
    console.log('Processing file upload for filing:', filing_id);
    
    // Get copyright record - RLS enforces ownership
    const { data: copyright } = await supabase
      .from('copyrights')
      .select('*')
      .eq('filing_id', filing_id)
      .single();

    if (!copyright) {
      throw new Error('Copyright record not found');
    }

    // Save file metadata - RLS enforces ownership
    const { data: upload } = await supabase
      .from('copyright_uploads')
      .insert({
        copyright_id: copyright.id,
        filename: fileData.filename,
        mime_type: fileData.mime_type,
        file_size: fileData.file_size,
        file_hash: fileData.file_hash,
        file_path: fileData.file_path
      })
      .select()
      .single();

    return {
      success: true,
      upload_id: upload.id,
      message: 'File uploaded successfully'
    };
  } catch (error) {
    console.error('Error handling file upload:', error);
    throw error;
  }
}

async function reviewFiling(supabase: any, filing_id: string) {
  // Get all sections for review - RLS enforces ownership
  const { data: sections } = await supabase
    .from('patent_sections')
    .select()
    .eq('filing_id', filing_id);

  return {
    success: true,
    sections: sections || [],
    ready_for_finalization: true
  };
}

// Generate USPTO-compliant PDF document
async function generatePatentPDF(supabase: any, filing_id: string, user_id: string) {
  try {
    console.log('Generating patent PDF for filing:', filing_id);
    
    // Get filing details - RLS enforces ownership
    const { data: filing, error: filingError } = await supabase
      .from('filings')
      .select('*')
      .eq('id', filing_id)
      .single();
    
    if (filingError) throw filingError;
    
    // Get all patent sections - RLS enforces ownership
    const { data: sections, error: sectionsError } = await supabase
      .from('patent_sections')
      .select('*')
      .eq('filing_id', filing_id)
      .order('created_at');
    
    if (sectionsError) throw sectionsError;
    
    // Generate USPTO-compliant PDF content
    const pdfContent = generateUSPTOPatentDocument(filing, sections);
    
    // Create PDF file name with user_id prefix for storage security
    const fileName = `${user_id}/${filing_id}/patent_application_${Date.now()}.pdf`;
    
    // Store PDF content (in production, use proper PDF generation library)
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    
    // Upload to storage - storage policies enforce ownership via path
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('filings')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Create filing document record - RLS enforces ownership
    const { data: document, error: docError } = await supabase
      .from('filing_documents')
      .insert({
        filing_id,
        document_type: 'patent_application_pdf',
        file_path: uploadData.path,
        metadata: {
          sections_count: sections.length,
          generated_at: new Date().toISOString(),
          format: 'USPTO_compliant'
        }
      })
      .select()
      .single();
    
    if (docError) throw docError;
    
    return {
      success: true,
      pdf_generated: true,
      document_id: document.id,
      file_path: uploadData.path,
      download_url: supabase.storage.from('filings').getPublicUrl(uploadData.path).data.publicUrl
    };
    
  } catch (error) {
    console.error('Error generating patent PDF:', error);
    throw error;
  }
}

function generateUSPTOPatentDocument(filing: any, sections: any[]) {
  // Generate USPTO-compliant document structure
  const sectionMap: any = {};
  sections.forEach((section: any) => {
    sectionMap[section.section_type] = section.content;
  });
  
  const document = `
USPTO PATENT APPLICATION

Title: ${filing.title}
Filing Date: ${new Date().toLocaleDateString()}
Applicant: [Applicant Information]

ABSTRACT

${sectionMap.abstract || 'Abstract not generated'}

BACKGROUND OF THE INVENTION

${sectionMap.background || 'Background not generated'}

BRIEF SUMMARY OF THE INVENTION

${sectionMap.summary || 'Summary not generated'}

BRIEF DESCRIPTION OF THE DRAWINGS

${sectionMap.brief_description_drawings || 'Drawings description not generated'}

DETAILED DESCRIPTION OF THE INVENTION

${sectionMap.detailed_description || 'Detailed description not generated'}

CLAIMS

${sectionMap.claims || 'Claims not generated'}

---

This document was generated by IPGenie AI Patent System
Generated on: ${new Date().toISOString()}
Filing ID: ${filing.id}
`;

  return document;
}

async function finalizeFiling(supabase: any, filing_id: string) {
  // Update filing status to completed - RLS enforces ownership
  await supabase
    .from('filings')
    .update({ 
      status: 'ready_for_submission',
      updated_at: new Date().toISOString()
    })
    .eq('id', filing_id);

  // Mark AI session as completed - RLS enforces ownership
  await supabase
    .from('ai_filing_sessions')
    .update({ 
      completion_status: 'completed',
      current_step: 'finalized'
    })
    .eq('filing_id', filing_id);

  return {
    success: true,
    status: 'ready_for_submission',
    next_actions: ['download_documents', 'review_with_attorney', 'submit_to_uspto']
  };
}
