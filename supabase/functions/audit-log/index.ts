import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

interface AuditLogRequest {
  action: string;
  subject_type?: string;
  subject_id?: string;
  metadata?: Record<string, unknown>;
  user_agent?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.slice(7).trim();

    // Create authenticated Supabase client to get user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Verify user
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: AuditLogRequest = await req.json();
    const { action, subject_type, subject_id, metadata, user_agent } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate action type
    const validActions = [
      'login', 'logout', 'signup', 'password_change', 'password_reset_request',
      'filing_view', 'filing_create', 'filing_update', 'filing_delete',
      'profile_update', 'preferences_update', 'session_refresh',
      'deadline_email_error', 'deadline_email_exception'
    ];
    
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from various headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
            || req.headers.get("x-real-ip") 
            || req.headers.get("cf-connecting-ip")
            || null;

    // Use service role to insert audit log (bypasses RLS)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await serviceClient
      .from("audit_log")
      .insert({
        user_id: user.id,
        action,
        subject_type: subject_type || null,
        subject_id: subject_id || null,
        metadata: metadata || {},
        ip: ip,
        user_agent: user_agent || null,
      });

    if (insertError) {
      console.error("Failed to insert audit log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Audit logged: ${action} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Audit log error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
