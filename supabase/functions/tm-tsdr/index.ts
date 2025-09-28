import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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