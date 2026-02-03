import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  const corsHeaders = getValidatedCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Delete expired intakes
    const { data: deletedIntakes, error: intakesError } = await supabase
      .from("intakes")
      .delete()
      .lt("delete_after", now)
      .select("id");

    if (intakesError) {
      console.error("Error deleting intakes:", intakesError);
    } else {
      console.log(`Deleted ${deletedIntakes?.length || 0} expired intakes`);
    }

    // Delete expired documents
    const { data: deletedDocs, error: docsError } = await supabase
      .from("documents")
      .delete()
      .lt("delete_after", now)
      .not("delete_after", "is", null)
      .select("id");

    if (docsError) {
      console.error("Error deleting documents:", docsError);
    } else {
      console.log(`Deleted ${deletedDocs?.length || 0} expired documents`);
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_intakes: deletedIntakes?.length || 0,
      deleted_documents: deletedDocs?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Cleanup failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
