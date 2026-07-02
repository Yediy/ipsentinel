import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from '../_shared/cors-validator.ts';
import { rateLimitMiddleware, RateLimitPresets } from '../_shared/rate-limiter.ts';
import { captureException } from '../_shared/sentry.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Rate limiting for webhook protection
  const rateLimitResponse = rateLimitMiddleware(req, RateLimitPresets.webhook, undefined, corsHeaders);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // Reject malformed / non-Stripe requests early with 400 instead of 500
    if (!body || !signature) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook request: missing body or stripe-signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

          // Create notification and send email
          const { data: filing } = await supabase
            .from('filings')
            .select(`
              id,
              title,
              type,
              user_id,
              profiles:user_id (email)
            `)
            .eq('id', session.client_reference_id)
            .single();

          if (filing) {
            const userEmail = filing.profiles?.email;
            
            if (!userEmail) {
              console.error('No email found for user:', filing.user_id);
            } else {
              // Create notification
              await supabase
                .from('notifications')
                .insert({
                  user_id: filing.user_id,
                  filing_id: session.client_reference_id,
                  type: 'payment_success',
                  title: 'Payment Confirmed',
                  message: `Payment confirmed for "${filing.title}". Your filing is now ready for processing.`,
                  read: false
                });

              // Send confirmation email
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Payment Confirmed! 🎉</h2>
                  <p>Your payment has been successfully processed for:</p>
                  
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0;">${filing.title}</h3>
                    <p style="margin: 5px 0;"><strong>Type:</strong> ${filing.type}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> Ready for processing</p>
                  </div>
                  
                  <p>Your filing is now ready and will be processed shortly.</p>
                  <p>You can view your filing details by logging into your IPGenie dashboard.</p>
                  
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
                    filing_id: session.client_reference_id,
                    notification_type: 'payment_success'
                  }
                });
                console.log('Payment confirmation email sent to:', userEmail);
              } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
                // Don't fail the webhook if email fails
              }
            }
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
    captureException(error, req);
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
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
