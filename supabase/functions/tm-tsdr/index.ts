import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TSQuery {
  id: string;
}

function tsdrUrl(id: string) {
  // TSDR v1 API endpoints: serial (8 digits) vs registration (numeric)
  const isSerial = /^\d{8}$/.test(id);
  return isSerial
    ? `https://tsdr.uspto.gov/ts/cd/case?sn=${id}`
    : `https://tsdr.uspto.gov/ts/cd/case?reg=${id}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const jwt = authHeader.slice(7).trim();
    
    // Verify authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` }}}
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const { id }: TSQuery = await req.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tsdrApiKey = Deno.env.get('TSDR_API_KEY');
    
    if (!tsdrApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'TSDR_API_KEY not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Querying TSDR for ID: ${id}`);
    
    const resp = await fetch(tsdrUrl(id), { 
      headers: { 
        'X-Api-Key': tsdrApiKey,
        'Accept': 'application/json'
      } 
    });

    if (!resp.ok) {
      console.error(`TSDR API error: ${resp.status}`);
      return new Response(
        JSON.stringify({ ok: false, status: resp.status, error: 'TSDR API error' }), 
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await resp.json();
    
    // Normalize useful fields from TSDR response
    const normalized = {
      id,
      mark: data.markIdentification || data.markText || null,
      status: data.statusCodeDescription || data.status || null,
      statusDate: data.statusDate || null,
      owner: data.ownerName || data.applicantName || null,
      classes: data.internationalClasses || [],
      filingDate: data.filingDate || null,
      registrationDate: data.registrationDate || null,
      docsUrl: data.caseId ? `https://tsdr.uspto.gov/documentviewer?caseId=${data.caseId}` : null
    };

    console.log(`TSDR response for ${id}:`, normalized);

    return new Response(
      JSON.stringify({ ok: true, data: normalized, raw: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('TSDR function error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});