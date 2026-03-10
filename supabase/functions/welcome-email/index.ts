import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse } from '../_shared/security-headers.ts';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from '../_shared/cors-validator.ts';

const POSTMARK_API_KEY = Deno.env.get('POSTMARK_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WelcomeEmailRequest {
  user_id: string;
  email: string;
  name?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  try {
    const { user_id, email, name }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return createSecureResponse({ error: 'Email is required' }, 400, corsHeaders);
    }

    // Send welcome email via Postmark
    if (POSTMARK_API_KEY) {
      const emailResponse = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': POSTMARK_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: 'noreply@ipgenie.app',
          To: email,
          Subject: 'Welcome to IPGenie',
          HtmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Welcome to IPGenie!</h1>
              <p>Hi ${name || 'there'},</p>
              <p>Thank you for joining IPGenie, your intelligent IP filing assistant.</p>
              <p>You can now:</p>
              <ul>
                <li>File patent, trademark, and copyright applications</li>
                <li>Generate professional specifications and drawings</li>
                <li>Track deadlines automatically</li>
                <li>Search prior art and trademark databases</li>
              </ul>
              <p>Get started by creating your first filing!</p>
              <p style="margin-top: 30px;">
                <a href="${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/dashboard" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Go to Dashboard
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                If you have any questions, feel free to reach out to our support team.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Postmark error:', errorText);
        throw new Error(`Postmark API error: ${errorText}`);
      }

      console.log('Welcome email sent successfully to:', email);
    } else {
      console.log('POSTMARK_API_KEY not set. Would send welcome email to:', email);
    }

    // Create notification in database
    if (user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      await supabase.from('notifications').insert({
        user_id,
        type: 'info',
        title: 'Welcome to IPGenie',
        message: 'Your account has been created successfully. Start by creating your first filing!',
      });
    }

    return createSecureResponse({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    }, 200, corsHeaders);

  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return createSecureResponse(
      { error: 'Failed to send welcome email' },
      500,
      corsHeaders
    );
  }
});
