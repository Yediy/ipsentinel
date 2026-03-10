import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filing_id, source_lang = 'en', target_lang = 'zh-CN', fields } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get external API base URL or use internal translation
    const translateApiUrl = Deno.env.get('LLM_TRANSLATE_API_URL');
    
    let translatedFields;
    
    if (translateApiUrl) {
      // Use external translation API
      const response = await fetch(`${translateApiUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_lang,
          target_lang,
          fields
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API failed: ${response.status}`);
      }

      const result = await response.json();
      translatedFields = result.translated;
    } else {
      // Use internal OpenAI translation if available
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) {
        throw new Error('No translation service configured. Please set LLM_TRANSLATE_API_URL or OPENAI_API_KEY');
      }

      translatedFields = await translateWithOpenAI(openaiKey, source_lang, target_lang, fields);
    }

    // Update filing record with translated content if filing_id provided
    if (filing_id && translatedFields) {
      await supabase
        .from('filings')
        .update({
          ...translatedFields,
          language: target_lang,
          needs_translation: false,
          translation_status: 'completed'
        })
        .eq('id', filing_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        translated: translatedFields,
        source_lang,
        target_lang,
        provider: translateApiUrl ? 'external' : 'openai'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Translation API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Translation failed',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});

async function translateWithOpenAI(apiKey: string, sourceLang: string, targetLang: string, fields: any) {
  const prompt = `Translate the following patent/IP filing fields from ${sourceLang} to ${targetLang}. Preserve technical terminology, claim numbering, and legal precision. Return only valid JSON with the same field structure.

Input fields: ${JSON.stringify(fields)}

Rules:
- Maintain exact claim numbering and structure
- Use precise technical and legal terminology
- Preserve formatting and line breaks
- For Chinese (zh-CN), use Simplified Chinese characters
- Return only the JSON object, no explanations`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a professional patent translator specializing in technical and legal terminology. Always return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI translation request failed');
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse OpenAI translation response:', content);
    // Return original fields as fallback
    return fields;
  }
}