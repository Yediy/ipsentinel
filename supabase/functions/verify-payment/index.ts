import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = [
  "https://ipsentinel.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function requireAuth(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    throw new Response(JSON.stringify({ error: "AuthRequired" }), { status: 401 });
  }
  return auth.slice(7).trim();
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const jwt = requireAuth(req);
    
    const { session_id } = await req.json();
    console.log("Verifying payment for session:", session_id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` }
        }
      }
    );

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      throw new Error("Session not found");
    }

    // Get payment and filing info from database
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        filings (
          id,
          title,
          type,
          status,
          contact_email
        )
      `)
      .eq("session_id", session_id)
      .single();

    if (paymentError) {
      console.error("Payment lookup error:", paymentError);
      throw new Error("Payment not found");
    }

    // Update payment status based on Stripe session
    let paymentStatus = 'pending';
    if (session.payment_status === 'paid') {
      paymentStatus = 'paid';
    } else if (session.payment_status === 'unpaid') {
      paymentStatus = 'failed';
    }

    if (payment.status !== paymentStatus) {
      await supabase
        .from("payments")
        .update({ status: paymentStatus })
        .eq("session_id", session_id);
    }

    return new Response(JSON.stringify({
      payment_status: paymentStatus,
      session_status: session.status,
      filing: payment.filings,
      amount_total: session.amount_total,
      customer_email: session.customer_details?.email
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});