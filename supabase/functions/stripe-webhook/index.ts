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
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message);
      return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
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
        .eq("session_id", session.id);

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

      // Get filing with user email
      const { data: filing } = await supabase
        .from("filings")
        .select(`
          id,
          title,
          type,
          user_id,
          profiles:user_id (email)
        `)
        .eq("id", filingId)
        .single();

      if (filing) {
        const userEmail = filing.profiles?.email;
        
        if (!userEmail) {
          console.error('No email found for user:', filing.user_id);
          return new Response(JSON.stringify({ error: 'User email not found' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Create notification
        await supabase
          .from("notifications")
          .insert({
            filing_id: filingId,
            user_id: filing.user_id,
            type: 'success',
            title: 'Payment Successful',
            message: `Your payment for "${filing.title}" has been processed. We're now generating your filing documents.`
          });

        // Send confirmation email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Payment Successful! 🎉</h2>
            <p>Thank you for your payment. We've successfully received your payment for:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${filing.title}</h3>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${filing.type}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Processing</p>
            </div>
            
            <h3>What happens next?</h3>
            <p>Our AI system is now generating your IP filing documents. This typically takes 5-10 minutes. You'll receive another email when your documents are ready for download.</p>
            
            <p>In the meantime, you can track your filing progress by logging into your IPGenie dashboard.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>The IPGenie Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        `;

        try {
          await supabase.functions.invoke('email-sender', {
            body: {
              to: userEmail,
              subject: `Payment Confirmed - ${filing.title}`,
              html: emailHtml,
              filing_id: filingId,
              notification_type: 'payment_success'
            }
          });
          console.log('Payment confirmation email sent to:', userEmail);
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't fail the webhook if email fails
        }
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

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error?.message || 'Webhook error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});