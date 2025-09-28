import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Create payment function called");
    
    const { plan, filingData, contactEmail } = await req.json();
    console.log("Plan requested:", plan);
    console.log("Filing data:", filingData);

    // Validate plan and get pricing
    const planPricing = {
      basic: { amount: 4900, name: "Basic Plan - AI Analysis" }, // $49
      review: { amount: 12900, name: "Review Plan - AI Analysis + Legal Review" }, // $129
      bundle: { amount: 19900, name: "Bundle Plan - Complete Protection Package" }, // $199
    };

    if (!(planPricing as any)[plan]) {
      throw new Error("Invalid plan selected");
    }

    const selectedPlan = (planPricing as any)[plan];
    console.log("Selected plan:", selectedPlan);

    // Create Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Create filing record first
    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .insert({
        contact_email: contactEmail,
        type: filingData.type,
        country: filingData.country || 'US',
        title: filingData.title,
        problem: filingData.problem,
        solution: filingData.solution,
        components: filingData.components,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (filingError) {
      console.error("Error creating filing:", filingError);
      throw new Error("Failed to create filing record");
    }

    console.log("Created filing:", filing.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      client_reference_id: filing.id, // Link session to filing
      customer_email: contactEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedPlan.name,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      metadata: {
        filing_id: filing.id,
        plan: plan
      }
    });

    // Create payment record
    await supabase
      .from("payments")
      .insert({
        filing_id: filing.id,
        plan: plan,
        amount: selectedPlan.amount,
        stripe_session_id: session.id,
        status: 'pending'
      });

    console.log("Stripe session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Payment creation failed' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});