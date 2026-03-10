import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return createCorsPreflightResponse(origin);
  }

  const corsHeaders = getValidatedCorsHeaders(origin);

  // Authenticate: only allow calls with the service role key
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Find expired intakes that haven't been cleaned yet
    const { data: expiredIntakes, error: fetchErr } = await supabase
      .from("intakes")
      .select("id, user_id")
      .lt("delete_after", now)
      .neq("status", "deleted");

    if (fetchErr) {
      console.error("Error fetching expired intakes:", fetchErr);
      throw fetchErr;
    }

    let cleanedCount = 0;

    for (const intake of expiredIntakes || []) {
      try {
        // 1. Find and delete storage objects
        const { data: docs } = await supabase
          .from("documents")
          .select("id, storage_key")
          .eq("intake_id", intake.id);

        if (docs && docs.length > 0) {
          const storageKeys = docs.map((d: any) => d.storage_key).filter(Boolean);
          if (storageKeys.length > 0) {
            await supabase.storage.from("filings").remove(storageKeys);
          }
          // Delete document rows
          await supabase.from("documents").delete().eq("intake_id", intake.id);
        }

        // 2. Clean up generation jobs
        await supabase.from("generation_jobs").delete().eq("intake_id", intake.id);

        // 3. Wipe answers and set status = deleted (keep row for payment ledger)
        await supabase
          .from("intakes")
          .update({ answers_json: {}, status: "deleted" })
          .eq("id", intake.id);

        cleanedCount++;
      } catch (err) {
        console.error(`Error cleaning intake ${intake.id}:`, err);
      }
    }

    console.log(`Cleaned ${cleanedCount} expired intakes`);

    return new Response(JSON.stringify({
      success: true,
      cleaned_intakes: cleanedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(JSON.stringify({ error: "Cleanup failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
