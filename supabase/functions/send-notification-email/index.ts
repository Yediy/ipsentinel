import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// Note: In production, you would use a service like Resend, SendGrid, or Postmark
// For this implementation, we'll create a stub that logs emails and could be extended

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  filing_id?: string;
  notification_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, filing_id, notification_type }: EmailRequest = await req.json();
    
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields: to, subject, html');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For MVP/pilot: Log email instead of sending
    // In production, replace this with actual email service
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Type:', notification_type);
    console.log('Filing ID:', filing_id);
    console.log('HTML Body:', html);
    console.log('========================');

    // Create an email log record for tracking
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        user_id: null, // Could be resolved from filing_id if needed
        contact_email: to,
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
        error: error.message || 'Email notification failed',
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