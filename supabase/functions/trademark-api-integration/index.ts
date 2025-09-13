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
    const { filing_id, ...params } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get external API base URL
    const trademarkApiUrl = Deno.env.get('TRADEMARK_API_URL') || 'http://localhost:8080';
    
    // Fetch filing data if filing_id provided
    let requestData = params;
    if (filing_id) {
      const { data: filing } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filing_id)
        .single();
        
      if (filing) {
        requestData = {
          route: filing.route || 'national',
          country_code: filing.country || 'US',
          mark_text: filing.tm_mark_text,
          mark_type: filing.tm_mark_type || 'word',
          mark_image_url: filing.tm_mark_image_url,
          classes: filing.tm_classes || [],
          cn_subclasses: filing.tm_cn_subclasses || [],
          filing_id
        };
      }
    }

    console.log('Preparing trademark package with data:', requestData);

    const response = await fetch(`${trademarkApiUrl}/api/trademark/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trademark preparation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Store document reference in database if PDF was generated
    if (result.pdf_url && filing_id) {
      await supabase
        .from('documents')
        .insert({
          filing_id,
          document_kind: 'pdf',
          file_url: result.pdf_url,
          file_hash: result.sha256
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Trademark API integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Trademark API integration failed',
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