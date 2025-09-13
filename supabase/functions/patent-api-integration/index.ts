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
    const { action, filing_id, ...params } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get external API base URL
    const patentApiUrl = Deno.env.get('PATENT_API_URL') || 'http://localhost:8080';
    
    let result;
    let documentKind = 'pdf';
    
    switch (action) {
      case 'generate_patent':
        result = await generatePatent(patentApiUrl, filing_id, params, supabase);
        documentKind = 'pdf';
        break;
        
      case 'national_package':
        result = await generateNationalPackage(patentApiUrl, filing_id, params, supabase);
        documentKind = 'pdf';
        break;
        
      case 'cn_options':
        result = await generateCnOptions(patentApiUrl, filing_id, params, supabase);
        documentKind = 'pdf';
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Store document reference in database if PDF was generated
    if (result.pdf_url && filing_id) {
      await supabase
        .from('documents')
        .insert({
          filing_id,
          document_kind: documentKind,
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
    console.error('Patent API integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Patent API integration failed',
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

async function generatePatent(apiUrl: string, filing_id: string, params: any, supabase: any) {
  // Fetch filing data if filing_id provided
  let filingData = params;
  if (filing_id) {
    const { data: filing } = await supabase
      .from('filings')
      .select('*')
      .eq('id', filing_id)
      .single();
      
    if (filing) {
      filingData = {
        title: filing.title,
        abstract: filing.abstract,
        description: filing.detailed_description,
        features: filing.features,
        claims: filing.claims,
        prior_art: filing.prior_art,
        country_code: filing.country,
        language: filing.language || 'en',
        cn_type: filing.cn_type,
        filing_id
      };
    }
  }

  const response = await fetch(`${apiUrl}/api/patent/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filingData)
  });

  if (!response.ok) {
    throw new Error(`Patent generation failed: ${response.status}`);
  }

  return await response.json();
}

async function generateNationalPackage(apiUrl: string, filing_id: string, params: any, supabase: any) {
  // Fetch filing data
  const { data: filing } = await supabase
    .from('filings')
    .select('*')
    .eq('id', filing_id)
    .single();

  const requestData = {
    priority_date: filing?.priority_date || params.priority_date,
    country_code: filing?.country || params.country_code || 'CN',
    route: filing?.route || params.route || 'pct',
    cn_type: filing?.cn_type || params.cn_type || 'invention',
    filing_id
  };

  const response = await fetch(`${apiUrl}/api/patent/national-package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    throw new Error(`National package generation failed: ${response.status}`);
  }

  return await response.json();
}

async function generateCnOptions(apiUrl: string, filing_id: string, params: any, supabase: any) {
  // Fetch filing data
  const { data: filing } = await supabase
    .from('filings')
    .select('*')
    .eq('id', filing_id)
    .single();

  const requestData = {
    cn_type: filing?.cn_type || params.cn_type || 'invention',
    filing_id
  };

  const response = await fetch(`${apiUrl}/api/patent/cn-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    throw new Error(`CN options generation failed: ${response.status}`);
  }

  return await response.json();
}