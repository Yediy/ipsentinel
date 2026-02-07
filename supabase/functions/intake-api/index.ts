import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware, RateLimitPresets } from "../_shared/rate-limiter.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ── Status Machine ──────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["ready_for_payment", "deleted"],
  ready_for_payment: ["paid", "deleted"],
  paid: ["generating", "deleted"],
  generating: ["ready", "failed", "deleted"],
  failed: ["generating", "deleted"],
  ready: ["deleted"],
  deleted: [],
};

function isValidTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Quality Scoring ─────────────────────────────────────────────────────
const QUALITY_WEIGHTS = { completeness: 0.35, specificity: 0.30, embodiments: 0.20, clarity: 0.15 };
const MIN_QUALITY_SCORE = 0.72;

const REQUIRED_FIELDS = [
  "title", "one_sentence", "problem", "users_industry", "current_solutions",
  "current_limits", "differentiators", "technical_explanation", "components_steps",
  "walkthrough", "variations", "required_optional", "environment", "equivalents",
  "keywords", "figures",
];

function calculateQualityScore(answers: Record<string, unknown>) {
  // Completeness
  let filledCount = 0;
  for (const field of REQUIRED_FIELDS) {
    const val = answers[field];
    if (val) {
      if (Array.isArray(val) && val.length > 0) filledCount++;
      else if (typeof val === "string" && val.length > 0) filledCount++;
    }
  }
  const completeness = filledCount / REQUIRED_FIELDS.length;

  // Specificity
  const textAnswers = Object.values(answers)
    .filter((v) => typeof v === "string")
    .join(" ");
  const hasNumbers = /\d+/.test(textAnswers);
  const hasUnits = /(inch|in\.|cm|mm|lb|kg|°|percent|%|ms|sec|min)/i.test(textAnswers);
  const specificity = (hasNumbers ? 0.5 : 0) + (hasUnits ? 0.5 : 0);

  // Embodiments
  const variations = (answers.variations as string) || "";
  const variationCount = (variations.match(/variation|alternative|option|version/gi) || []).length;
  const embodiments = Math.min(variationCount / 2, 1);

  // Clarity
  let clarityScore = 0;
  let clarityCount = 0;
  for (const field of ["problem", "technical_explanation", "walkthrough", "variations"]) {
    const val = answers[field];
    if (typeof val === "string" && val.length > 0) {
      clarityScore += Math.min(val.length / 300, 1);
      clarityCount++;
    }
  }
  const clarity = clarityCount > 0 ? clarityScore / clarityCount : 0;

  const overall =
    completeness * QUALITY_WEIGHTS.completeness +
    specificity * QUALITY_WEIGHTS.specificity +
    embodiments * QUALITY_WEIGHTS.embodiments +
    clarity * QUALITY_WEIGHTS.clarity;

  return {
    overall: Math.round(overall * 100) / 100,
    breakdown: {
      completeness: Math.round(completeness * 100) / 100,
      specificity: Math.round(specificity * 100) / 100,
      embodiments: Math.round(embodiments * 100) / 100,
      clarity: Math.round(clarity * 100) / 100,
    },
  };
}

function getFollowups(score: ReturnType<typeof calculateQualityScore>) {
  const followups: { id: string; prompt: string }[] = [];
  if (score.breakdown.specificity < 0.5)
    followups.push({ id: "followup_missing_numbers", prompt: "Add any numbers or ranges (size, speed, weight, temperature, load, latency). Even estimates help." });
  if (score.breakdown.embodiments < 0.5)
    followups.push({ id: "followup_missing_variations", prompt: "Describe at least two variations: different mechanism/material/software approach, or different form factor." });
  if (score.breakdown.completeness < 0.8)
    followups.push({ id: "followup_incomplete", prompt: "Please complete all required fields for a stronger patent application." });
  return followups;
}

// ── Helpers ─────────────────────────────────────────────────────────────
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

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") return createCorsPreflightResponse(origin);

  // Rate limiting
  const rl = rateLimitMiddleware(req, RateLimitPresets.standard, undefined, corsHeaders);
  if (rl) return rl;

  try {
    const user = await authenticateUser(req);
    if (!user) return json({ error: "Authentication required" }, 401, corsHeaders);

    const body = req.method === "POST" || req.method === "PUT" ? await req.json() : {};
    const action: string = body.action || "";
    const sc = getServiceClient();

    // ── CREATE ────────────────────────────────────────────────────────
    if (action === "create") {
      const deleteAfter = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const { data: intake, error } = await sc
        .from("intakes")
        .insert({
          user_id: user.id,
          wizard_version: body.wizard_version || "v1.0",
          status: "draft",
          answers_json: {},
          quality_score: null,
          delete_after: deleteAfter,
        })
        .select("id, wizard_version, status, quality_score, delete_after, created_at, updated_at")
        .single();

      if (error) throw error;
      return json({ intake }, 201, corsHeaders);
    }

    // ── All subsequent actions require an intake ID ───────────────────
    const intakeId: string = body.id;
    if (!intakeId) return json({ error: "id is required" }, 400, corsHeaders);

    // Fetch intake and verify ownership
    const { data: intake, error: fetchErr } = await sc
      .from("intakes")
      .select("*")
      .eq("id", intakeId)
      .single();

    if (fetchErr || !intake) return json({ error: "Intake not found" }, 404, corsHeaders);
    if (intake.user_id !== user.id) return json({ error: "Unauthorized" }, 403, corsHeaders);

    // ── AUTOSAVE ──────────────────────────────────────────────────────
    if (action === "autosave") {
      if (intake.status !== "draft") {
        return json({ error: "Can only autosave in draft status" }, 400, corsHeaders);
      }

      const answersJson = body.answers_json;
      if (!answersJson || typeof answersJson !== "object") {
        return json({ error: "answers_json is required" }, 400, corsHeaders);
      }

      // Light scoring on save (don't gate or transition)
      const score = calculateQualityScore(answersJson);

      const { error: updateErr } = await sc
        .from("intakes")
        .update({
          answers_json: answersJson,
          quality_score: score.overall,
        })
        .eq("id", intakeId);

      if (updateErr) throw updateErr;

      return json({
        intake: {
          id: intakeId,
          status: "draft",
          quality_score: score.overall,
          updated_at: new Date().toISOString(),
        },
      }, 200, corsHeaders);
    }

    // ── SCORE (Quality Gate) ──────────────────────────────────────────
    if (action === "score") {
      if (intake.status !== "draft") {
        return json({ error: "Can only score in draft status" }, 400, corsHeaders);
      }

      const answers = intake.answers_json as Record<string, unknown>;
      const score = calculateQualityScore(answers);
      const followups = getFollowups(score);

      // Determine new status
      const passes = score.overall >= MIN_QUALITY_SCORE && followups.length === 0;
      const newStatus = passes ? "ready_for_payment" : "draft";

      const { error: updateErr } = await sc
        .from("intakes")
        .update({
          quality_score: score.overall,
          status: newStatus,
        })
        .eq("id", intakeId);

      if (updateErr) throw updateErr;

      return json({
        score: { overall: score.overall, breakdown: score.breakdown },
        followups,
        intake: { id: intakeId, status: newStatus, quality_score: score.overall },
      }, 200, corsHeaders);
    }

    // ── STATUS (Polling) ──────────────────────────────────────────────
    if (action === "status") {
      return json({
        id: intakeId,
        status: intake.status,
        quality_score: intake.quality_score,
      }, 200, corsHeaders);
    }

    // ── DELETE NOW ────────────────────────────────────────────────────
    if (action === "delete") {
      // Delete document files from storage
      const { data: docs } = await sc
        .from("documents")
        .select("id, storage_key")
        .eq("intake_id", intakeId);

      if (docs && docs.length > 0) {
        const storageKeys = docs.map((d: any) => d.storage_key).filter(Boolean);
        if (storageKeys.length > 0) {
          await sc.storage.from("filings").remove(storageKeys);
        }
        // Delete document rows
        await sc.from("documents").delete().eq("intake_id", intakeId);
      }

      // Wipe answers_json, set deleted
      await sc
        .from("intakes")
        .update({ answers_json: {}, status: "deleted" })
        .eq("id", intakeId);

      // Clean up generation jobs
      await sc.from("generation_jobs").delete().eq("intake_id", intakeId);

      return json({ status: "deleted" }, 200, corsHeaders);
    }

    // ── RETRY GENERATION ──────────────────────────────────────────────
    if (action === "retry") {
      if (intake.status !== "failed") {
        return json({ error: "Can only retry from failed status" }, 400, corsHeaders);
      }

      if (!intake.filing_id) {
        return json({ error: "No filing associated with this intake" }, 400, corsHeaders);
      }

      // Transition to generating
      await sc
        .from("intakes")
        .update({ status: "generating" })
        .eq("id", intakeId);

      // Create new generation job
      await sc.from("generation_jobs").insert({
        intake_id: intakeId,
        status: "queued",
        attempts: 0,
      });

      // Trigger generation
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-provisional`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            intake_id: intakeId,
            filing_id: intake.filing_id,
          }),
        });
      } catch (triggerErr) {
        console.error("Failed to trigger generation:", triggerErr);
      }

      return json({
        intake: { id: intakeId, status: "generating" },
      }, 200, corsHeaders);
    }

    return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
  } catch (error: any) {
    console.error("Intake API error:", error);
    await captureException(error, { tags: { function: "intake-api" }, request: req });
    return json({ error: error?.message || "Internal error" }, 500, corsHeaders);
  }
});
