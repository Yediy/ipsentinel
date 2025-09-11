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
    console.log("Stripe webhook called");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Webhook event type:", event.type);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const filingId = session.client_reference_id || session.metadata?.filing_id;
      
      console.log("Processing successful payment for filing:", filingId);

      if (!filingId) {
        console.error("No filing ID found in session");
        return new Response("No filing ID found", { status: 400 });
      }

      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ 
          status: 'paid'
        })
        .eq("stripe_session_id", session.id);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      // Update filing status and payment status
      const { error: filingError } = await supabase
        .from("filings")
        .update({ 
          status: 'generating',
          payment_status: 'paid'
        })
        .eq("id", filingId);

      if (filingError) {
        console.error("Error updating filing:", filingError);
      }

      // Add job to filing queue
      const { error: queueError } = await supabase
        .from("filing_queue")
        .insert({
          filing_id: filingId,
          job_type: 'generate',
          status: 'queued'
        });

      if (queueError) {
        console.error("Error adding to queue:", queueError);
      }

      // Create notification
      const { data: filing } = await supabase
        .from("filings")
        .select("contact_email, title")
        .eq("id", filingId)
        .single();

      if (filing) {
        await supabase
          .from("notifications")
          .insert({
            filing_id: filingId,
            contact_email: filing.contact_email,
            type: 'success',
            title: 'Payment Successful',
            message: `Your payment for "${filing.title}" has been processed. We're now generating your filing documents.`
          });
      }

      // Trigger the generate-filing function
      try {
        await supabase.functions.invoke('generate-filing', {
          body: { filing_id: filingId }
        });
      } catch (invokeError) {
        console.error("Error invoking generate-filing:", invokeError);
      }

      console.log("Successfully processed payment webhook");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});