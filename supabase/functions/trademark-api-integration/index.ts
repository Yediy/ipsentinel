import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware, RateLimitPresets } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  const corsHeaders = getValidatedCorsHeaders(origin);

  try {
    // Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.ai, undefined, corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header', success: false }),
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
        JSON.stringify({ error: 'Unauthorized: Invalid token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    const { filing_id, ...params } = await req.json();
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the filing
    let requestData = params;
    if (filing_id) {
      const { data: filing, error: filingError } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filing_id)
        .single();

      if (filingError || !filing) {
        return new Response(
          JSON.stringify({ error: 'Filing not found', success: false }),
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
            JSON.stringify({ error: 'Unauthorized: You do not own this filing', success: false }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Build request data from filing
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

    // Get external API base URL
    const trademarkApiUrl = Deno.env.get('TRADEMARK_API_URL') || 'http://localhost:8080';

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
    
    // Report to Sentry
    await captureException(error, {
      tags: { function: "trademark-api-integration" },
      request: req,
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Trademark API integration failed',
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
