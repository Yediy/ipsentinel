import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
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
    
    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` }}
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const filingId = formData.get('filing_id') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Uploading drawing file: ${file.name}, size: ${file.size}`);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `drawing_${timestamp}.${fileExt}`;
    const filePath = filingId ? `${filingId}/${fileName}` : fileName;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('filings')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (1 hour expiry) instead of public URL for security
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('filings')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Failed to create signed URL:', signedUrlError);
      throw new Error(`Failed to generate secure URL: ${signedUrlError.message}`);
    }

    console.log('Drawing uploaded successfully with signed URL');

    return new Response(
      JSON.stringify({
        success: true,
        asset_url: signedUrlData.signedUrl,
        file_path: filePath,
        original_name: file.name,
        size: file.size,
        expires_in: 3600 // URL expires in 1 hour
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Drawing upload error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Drawing upload failed',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});