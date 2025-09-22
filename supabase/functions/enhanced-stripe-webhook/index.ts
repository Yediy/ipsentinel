import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('Missing Stripe webhook secret');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log('Processing Stripe event:', event.type, event.id);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        // Update or create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .upsert({
            session_id: session.id,
            filing_id: session.client_reference_id || null,
            status: 'completed',
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'usd',
            raw_payload: event.data.object,
            provider: 'stripe'
          }, {
            onConflict: 'session_id'
          });

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
          throw paymentError;
        }

        // If filing_id exists, update filing status
        if (session.client_reference_id) {
          const { error: filingError } = await supabase
            .from('filings')
            .update({
              status: 'ready',
              payment_status: 'completed'
            })
            .eq('id', session.client_reference_id);

          if (filingError) {
            console.error('Error updating filing:', filingError);
            throw filingError;
          }

          // Create notification
          const { data: filing } = await supabase
            .from('filings')
            .select('user_id, contact_email, title')
            .eq('id', session.client_reference_id)
            .single();

          if (filing) {
            await supabase
              .from('notifications')
              .insert({
                user_id: filing.user_id,
                contact_email: filing.contact_email,
                filing_id: session.client_reference_id,
                type: 'payment_success',
                title: 'Payment Confirmed',
                message: `Payment confirmed for "${filing.title}". Your filing is now ready for processing.`,
                read: false
              });
          }

          console.log('Filing updated to ready status:', session.client_reference_id);
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session expired:', session.id);

        // Update payment record
        await supabase
          .from('payments')
          .upsert({
            session_id: session.id,
            filing_id: session.client_reference_id || null,
            status: 'expired',
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'usd',
            raw_payload: event.data.object,
            provider: 'stripe'
          }, {
            onConflict: 'session_id'
          });

        // Update filing status if exists
        if (session.client_reference_id) {
          await supabase
            .from('filings')
            .update({
              payment_status: 'expired'
            })
            .eq('id', session.client_reference_id);
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent succeeded:', paymentIntent.id);

        // Additional handling for direct payment intents if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent failed:', paymentIntent.id);

        // Handle failed payments
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        event_type: event.type,
        event_id: event.id 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Webhook processing failed',
        received: false 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});