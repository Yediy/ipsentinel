import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimitMiddleware, RateLimitPresets } from '../_shared/rate-limiter.ts';
import { captureException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting for webhook protection
  const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.webhook, undefined, corsHeaders);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const webhookSecret = req.headers.get('x-webhook-secret');
    
    console.log('Webhook received:', {
      headers: {
        'content-type': req.headers.get('content-type'),
        'origin': req.headers.get('origin'),
        'x-client-info': req.headers.get('x-client-info'),
      },
      filing_id: body?.filing_id,
      kind: body?.kind,
    });

    // Validate webhook secret for security
    const expectedSecret = Deno.env.get('LOVABLE_DOC_WEBHOOK_SECRET');
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret provided');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { filing_id, kind = 'pdf', url, sha256 } = body;

    if (!filing_id || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: filing_id, url' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for duplicate documents based on filing_id + sha256
    let isDuplicate = false;
    if (sha256) {
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('filing_id', filing_id)
        .eq('sha256', sha256)
        .limit(1);

      if (existing && existing.length > 0) {
        isDuplicate = true;
        console.log('Duplicate document detected, skipping insert');
      }
    }

    if (!isDuplicate) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          filing_id,
          kind: kind,
          url: url,
          sha256
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Database insertion failed' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Document stored successfully:', data);
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        dedup: isDuplicate,
        message: isDuplicate ? 'Document already exists' : 'Document stored successfully'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    captureException(error, req);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
