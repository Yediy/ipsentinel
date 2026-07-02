import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

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

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  filing_id?: string;
  notification_type?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const jwt = requireAuth(req);

    let payload: Partial<EmailRequest> = {};
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, html, filing_id, notification_type } = payload as EmailRequest;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: { Authorization: `Bearer ${jwt}` }
      }
    });

    // For MVP/pilot: Log email instead of sending
    // In production, replace this with actual email service
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Type:', notification_type);
    console.log('Filing ID:', filing_id);
    console.log('HTML Body:', html);
    console.log('========================');

    // Get user_id from the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create an email log record for tracking
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        user_id: user?.id || null,
        filing_id: filing_id || null,
        type: notification_type || 'email',
        title: subject,
        message: `Email sent to ${to}`,
        read: false
      });

    if (logError) {
      console.error('Error logging email notification:', logError);
    }

    // TODO: Implement actual email sending with your preferred service
    // Example services and their implementations:
    
    /*
    // RESEND EXAMPLE:
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: 'IP Genie <noreply@yourdomain.com>',
        to: [to],
        subject: subject,
        html: html,
      });
      console.log('Resend response:', emailResponse);
    }
    */

    /*
    // SENDGRID EXAMPLE:
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }],
            subject: subject
          }],
          from: { email: 'noreply@yourdomain.com', name: 'IP Genie' },
          content: [{ type: 'text/html', value: html }]
        })
      });
      console.log('SendGrid response status:', response.status);
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email logged (implement email service for actual sending)',
        email_logged: true
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Email notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Email notification failed',
        success: false 
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