import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";
import { captureException } from "../_shared/sentry.ts";
import { rateLimitMiddleware, RateLimitPresets } from "../_shared/rate-limiter.ts";

const TIER_PRICING: Record<string, { amount: number; name: string; delivery: string }> = {
  starter: { amount: 4900, name: "Starter - AI Patent Draft", delivery: "72h" },
  pro: { amount: 12900, name: "Professional - Enhanced Draft", delivery: "48h" },
  pro_plus: { amount: 19900, name: "Professional+ - Complete Package", delivery: "24h" },
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === "OPTIONS") return createCorsPreflightResponse(origin);

  try {
    // Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.payment, undefined, corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.slice(7).trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { intake_id, tier } = await req.json();
    console.log("Provisional payment request:", { intake_id, tier, user_id: user.id });

    if (!intake_id || !tier) {
      return new Response(
        JSON.stringify({ error: "intake_id and tier are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tier
    const selectedTier = TIER_PRICING[tier];
    if (!selectedTier) {
      return new Response(
        JSON.stringify({ error: "Invalid tier selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify intake exists, belongs to user, and has correct status
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, quality_score, status, user_id")
      .eq("id", intake_id)
      .single();

    if (intakeError || !intake) {
      return new Response(
        JSON.stringify({ error: "Intake not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (intake.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to intake" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Status gate: must be ready_for_payment ─────────────────────────
    if (intake.status !== "ready_for_payment") {
      return new Response(
        JSON.stringify({
          error: `Intake must be in "ready_for_payment" status. Current: "${intake.status}"`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Quality gate check (defense-in-depth)
    if (!intake.quality_score || intake.quality_score < 0.72) {
      return new Response(
        JSON.stringify({ error: "Quality score must be at least 72% to proceed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a filing record for this provisional patent
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: filing, error: filingError } = await serviceClient
      .from("filings")
      .insert({
        user_id: user.id,
        type: "provisional_patent",
        country: "US",
        country_code: "US",
        title: "Provisional Patent Application",
        status: "pending_payment",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (filingError) {
      console.error("Error creating filing:", filingError);
      throw new Error("Failed to create filing record");
    }

    // Link intake to filing
    await serviceClient
      .from("intakes")
      .update({ filing_id: filing.id })
      .eq("id", intake_id);

    console.log("Created filing:", filing.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      client_reference_id: filing.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedTier.name,
              description: `Provisional Patent Draft - ${selectedTier.delivery} delivery`,
            },
            unit_amount: selectedTier.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=provisional`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      metadata: {
        filing_id: filing.id,
        intake_id: intake_id,
        tier: tier,
        type: "provisional_patent",
      },
    });

    // Create payment record with intake_id
    await serviceClient.from("payments").insert({
      filing_id: filing.id,
      intake_id: intake_id,
      session_id: session.id,
      amount_cents: selectedTier.amount,
      currency: "usd",
      status: "pending",
      provider: "stripe",
    });

    console.log("Stripe session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, checkout_url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Provisional payment error:", error);
    await captureException(error, { tags: { function: "provisional-payment" }, request: req });

    return new Response(
      JSON.stringify({ error: error?.message || "Payment creation failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
