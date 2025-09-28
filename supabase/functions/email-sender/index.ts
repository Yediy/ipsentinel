import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  from?: string;
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
    const { to, from, subject, html, filing_id, notification_type }: EmailRequest = await req.json();
    
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields: to, subject, html');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Postmark for email sending
    const postmarkToken = Deno.env.get('POSTMARK_TOKEN');
    const fromEmail = from || Deno.env.get('FROM_EMAIL') || 'noreply@ipgenie.app';

    if (postmarkToken) {
      console.log('Sending email via Postmark to:', to);
      
      const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': postmarkToken,
        },
        body: JSON.stringify({
          From: fromEmail,
          To: to,
          Subject: subject,
          HtmlBody: html,
          MessageStream: 'outbound'
        })
      });

      if (!postmarkResponse.ok) {
        const error = await postmarkResponse.text();
        console.error('Postmark error:', error);
        throw new Error(`Postmark API error: ${postmarkResponse.status}`);
      }

      const postmarkResult = await postmarkResponse.json();
      console.log('Postmark response:', postmarkResult);
    } else {
      // Fallback: Log email for development
      console.log('=== EMAIL NOTIFICATION (NO POSTMARK TOKEN) ===');
      console.log('To:', to);
      console.log('From:', fromEmail);
      console.log('Subject:', subject);
      console.log('Type:', notification_type);
      console.log('Filing ID:', filing_id);
      console.log('HTML Body:', html);
      console.log('==============================================');
    }

    // Create notification record for tracking
    if (filing_id) {
      const { data: filing } = await supabase
        .from('filings')
        .select('user_id')
        .eq('id', filing_id)
        .single();

      if (filing) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: filing.user_id,
            filing_id: filing_id,
            type: notification_type || 'email',
            title: subject,
            message: `Email sent to ${to}`,
            read: false
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: postmarkToken ? 'Email sent successfully' : 'Email logged (add POSTMARK_TOKEN for actual sending)',
        email_sent: !!postmarkToken
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Email sender error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Email sending failed',
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