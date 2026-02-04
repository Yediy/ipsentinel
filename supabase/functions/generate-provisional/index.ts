import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
Key differentiators: ${answers.differentiators?.join(', ')}
Required components: ${answers.required_optional}

Summarize the invention's key aspects and advantages over prior art.`,

    detailed_description: `Generate a Detailed Description section (4-6 paragraphs) for:
Technical explanation: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(', ')}
Usage walkthrough: ${answers.walkthrough}
Operating environment: ${answers.environment}
Constraints/specs: ${answers.constraints || 'N/A'}

Describe the invention in detail with reference to the figures. Use formal patent language.`,

    claims: `Generate patent claims (10-15 claims) for:
Invention: ${answers.one_sentence}
Technical details: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(', ')}
Variations: ${answers.variations}
Required vs optional: ${answers.required_optional}
Equivalents: ${answers.equivalents}

Include:
- 2-3 independent claims (broad scope)
- 7-12 dependent claims (specific features)

Format each claim properly with claim numbers and proper dependency references.`,

    figure_descriptions: `Based on the selected figure types: ${answers.figures?.join(', ')}
And the invention: ${answers.technical_explanation}
Components: ${answers.components_steps?.join(', ')}

Generate brief descriptions and prompts for creating each figure type. Include what elements should be labeled.`
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert patent attorney drafting provisional patent applications. Write in formal patent language following USPTO conventions. Be thorough but precise.'
        },
        {
          role: 'user',
          content: prompts[section]
        }
      ],
      max_tokens: section === 'claims' ? 3000 : 1500,
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  try {
    const { intake_id, filing_id } = await req.json();
    console.log("Generate provisional called:", { intake_id, filing_id });

    if (!intake_id || !filing_id) {
      return new Response(
        JSON.stringify({ error: 'intake_id and filing_id required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get intake data
    const { data: intake, error: intakeError } = await supabase
      .from('intakes')
      .select('*')
      .eq('id', intake_id)
      .single();

    if (intakeError || !intake) {
      throw new Error('Intake not found');
    }

    // Update intake status to generating
    await supabase
      .from('intakes')
      .update({ status: 'generating' })
      .eq('id', intake_id);

    // Create generation job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        intake_id,
        status: 'running',
        attempts: 1
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
    }

    const answers = intake.answers_json as IntakeAnswers;

    // Generate all sections
    const sections = ['title', 'abstract', 'background', 'summary', 'detailed_description', 'claims', 'figure_descriptions'];
    const generatedContent: Record<string, string> = {};

    for (const section of sections) {
      console.log(`Generating section: ${section}`);
      try {
        generatedContent[section] = await generatePatentSection(section, answers, OPENAI_API_KEY!);
      } catch (err) {
        console.error(`Error generating ${section}:`, err);
        generatedContent[section] = `[Error generating ${section}]`;
      }
    }

    // Update filing with generated content
    const { error: updateError } = await supabase
      .from('filings')
      .update({
        title: answers.title || generatedContent.title,
        abstract: generatedContent.abstract,
        background: generatedContent.background,
        summary: generatedContent.summary,
        detailed_description: generatedContent.detailed_description,
        claims: generatedContent.claims,
        status: 'ready',
        generated_content: {
          figure_descriptions: generatedContent.figure_descriptions,
          generated_at: new Date().toISOString(),
          tier: 'provisional'
        }
      })
      .eq('id', filing_id);

    if (updateError) {
      throw updateError;
    }

    // Update intake status
    await supabase
      .from('intakes')
      .update({ status: 'ready' })
      .eq('id', intake_id);

    // Update job status
    if (job) {
      await supabase
        .from('generation_jobs')
        .update({ status: 'succeeded' })
        .eq('id', job.id);
    }

    // Notify user
    await supabase.rpc('notify_user', {
      p_user_id: intake.user_id,
      p_filing_id: filing_id,
      p_subject: 'Patent Draft Ready',
      p_body: 'Your provisional patent draft is ready for review.'
    });

    console.log("Generation complete for filing:", filing_id);

    return new Response(
      JSON.stringify({ success: true, filing_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Generation error:", error);
    await captureException(error, { tags: { function: "generate-provisional" }, request: req });

    return new Response(
      JSON.stringify({ error: error?.message || 'Generation failed' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});