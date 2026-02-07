import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const SIGNED_URL_TTL = 15 * 60; // 15 minutes

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const jwt = authHeader.slice(7).trim();
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") return createCorsPreflightResponse(origin);

  try {
    const user = await authenticateUser(req);
    if (!user) return json({ error: "Authentication required" }, 401, corsHeaders);

    const body = await req.json();
    const action: string = body.action || "";
    const sc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── LIST DOCUMENTS ────────────────────────────────────────────────
    if (action === "list") {
      const intakeId = body.intake_id;
      if (!intakeId) return json({ error: "intake_id is required" }, 400, corsHeaders);

      // Verify intake ownership
      const { data: intake, error: intakeErr } = await sc
        .from("intakes")
        .select("id, user_id, status")
        .eq("id", intakeId)
        .single();

      if (intakeErr || !intake) return json({ error: "Intake not found" }, 404, corsHeaders);
      if (intake.user_id !== user.id) return json({ error: "Unauthorized" }, 403, corsHeaders);
      if (intake.status !== "ready") {
        return json({ error: "Documents only available when intake is ready" }, 400, corsHeaders);
      }

      const { data: docs, error: docsErr } = await sc
        .from("documents")
        .select("id, kind, doc_type, created_at")
        .eq("intake_id", intakeId)
        .order("created_at", { ascending: true });

      if (docsErr) throw docsErr;

      return json({
        documents: (docs || []).map((d: any) => ({
          id: d.id,
          kind: d.doc_type || d.kind,
          created_at: d.created_at,
        })),
      }, 200, corsHeaders);
    }

    // ── SIGNED URL ────────────────────────────────────────────────────
    if (action === "signed-url") {
      const documentId = body.document_id;
      if (!documentId) return json({ error: "document_id is required" }, 400, corsHeaders);

      // Fetch document
      const { data: doc, error: docErr } = await sc
        .from("documents")
        .select("id, intake_id, filing_id, storage_key, kind, url")
        .eq("id", documentId)
        .single();

      if (docErr || !doc) return json({ error: "Document not found" }, 404, corsHeaders);

      // Verify ownership via intake or filing
      let authorized = false;

      if (doc.intake_id) {
        const { data: intake } = await sc
          .from("intakes")
          .select("user_id, status")
          .eq("id", doc.intake_id)
          .single();

        if (intake && intake.user_id === user.id && intake.status === "ready") {
          authorized = true;
        }
      }

      if (!authorized && doc.filing_id) {
        const { data: filing } = await sc
          .from("filings")
          .select("user_id")
          .eq("id", doc.filing_id)
          .single();

        if (filing && filing.user_id === user.id) {
          authorized = true;
        }
      }

      if (!authorized) return json({ error: "Unauthorized" }, 403, corsHeaders);

      // Generate signed URL
      const storagePath = doc.storage_key || doc.url;
      const { data: signedUrl, error: signErr } = await sc.storage
        .from("filings")
        .createSignedUrl(storagePath, SIGNED_URL_TTL);

      if (signErr) throw signErr;

      return json({ url: signedUrl?.signedUrl }, 200, corsHeaders);
    }

    return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
  } catch (error: any) {
    console.error("Intake documents error:", error);
    await captureException(error, { tags: { function: "intake-documents" }, request: req });
    return json({ error: error?.message || "Internal error" }, 500, corsHeaders);
  }
});
