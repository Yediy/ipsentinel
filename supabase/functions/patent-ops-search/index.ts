import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OPSQuery {
  q?: string;
  ipc?: string;
  rows?: number;
  from?: number;
}

function buildCql(q?: string, ipc?: string) {
  const parts = [];
  if (q) parts.push(`ti="${q}" or ab="${q}"`);
  if (ipc) parts.push(`ipc=${ipc}`);
  return parts.length ? parts.join(' and ') : 'pn=US'; // fallback
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
    
    const { q, ipc, rows = 10, from = 1 }: OPSQuery = await req.json();
    
    const opsKey = Deno.env.get('EPO_OPS_KEY');
    const opsSecret = Deno.env.get('EPO_OPS_SECRET');
    
    if (!opsKey || !opsSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: 'EPO OPS credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const cql = buildCql(q, ipc);
    const url = `https://ops.epo.org/3.2/rest-services/published-data/search/biblio?q=${encodeURIComponent(cql)}&Range=${from}-${from + rows - 1}`;
    const auth = 'Basic ' + btoa(`${opsKey}:${opsSecret}`);

    console.log(`EPO OPS search: ${cql}`);

    const resp = await fetch(url, { 
      headers: { 
        Authorization: auth, 
        Accept: 'application/json' 
      } 
    });

    if (!resp.ok) {
      console.error(`EPO OPS error: ${resp.status}`);
      return new Response(
        JSON.stringify({ ok: false, status: resp.status, error: 'EPO OPS API error' }), 
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await resp.json();
    
    // Extract and normalize results from OPS response
    const results = data?.['ops:world-patent-data']?.['ops:biblio-search']?.['ops:search-result']?.['ops:result'] || [];
    
    const items = Array.isArray(results) ? results.map((r: any) => {
      const pub = r?.['ops:publication-reference']?.['document-id']?.[0];
      const inventionTitle = r?.['bibliographic-data']?.['invention-title'];
      
      // Handle different title formats from OPS
      let title = '';
      if (Array.isArray(inventionTitle)) {
        title = inventionTitle.find((t: any) => t['@lang'] === 'en')?.$;
        if (!title) title = inventionTitle[0]?.$;
      } else if (inventionTitle?.$) {
        title = inventionTitle.$;
      }

      return {
        doc: `${pub?.['doc-number']?.$ || ''}${pub?.kind?.$ ? ' ' + pub.kind.$ : ''}`,
        country: pub?.country?.$,
        date: pub?.date?.$,
        title: title || '(no title)'
      };
    }) : [];

    console.log(`EPO OPS found ${items.length} results`);

    return new Response(
      JSON.stringify({ ok: true, items }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('EPO OPS function error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'An internal error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});