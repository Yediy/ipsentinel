import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse, handleCorsPreFlight } from '../_shared/security-headers.ts';
import { handleError, createValidationError } from '../_shared/error-handler.ts';
import { validateEmail } from '../_shared/validation.ts';

interface EmailRequest {
  to: string;
  from?: string;
  subject: string;
  html: string;
  filing_id?: string;
  notification_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }

    const jwt = authHeader.slice(7).trim();
    
    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` }}
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    const { to, from, subject, html, filing_id, notification_type }: EmailRequest = await req.json();
    
    // Validate required fields
    if (!to || !subject || !html) {
      throw createValidationError('Missing required email fields: to, subject, html');
    }

    // Validate email format
    if (!validateEmail(to)) {
      throw createValidationError('Invalid recipient email address');
    }

    if (from && !validateEmail(from)) {
      throw createValidationError('Invalid sender email address');
    }

    // Validate content lengths
    if (subject.length > 500) {
      throw createValidationError('Subject too long (max 500 characters)');
    }

    if (html.length > 500000) {
      throw createValidationError('HTML content too long (max 500KB)');
    }

    // Initialize Supabase service client for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Postmark for email sending
    const postmarkApiKey = Deno.env.get('POSTMARK_API_KEY');
    const fromEmail = from || Deno.env.get('FROM_EMAIL') || 'noreply@ipgenie.app';

    if (postmarkApiKey) {
      console.log('Sending email via Postmark to:', to);
      
      const postmarkResponse = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': postmarkApiKey,
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
      // Fallback: Log email for development (without sensitive content)
      console.log('=== EMAIL NOTIFICATION (NO POSTMARK_API_KEY) ===');
      console.log('To:', to);
      console.log('From:', fromEmail);
      console.log('Subject:', subject);
      console.log('Type:', notification_type);
      console.log('Filing ID:', filing_id);
      console.log('Note: HTML body not logged for security');
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

    return createSecureResponse({
      success: true,
      message: postmarkApiKey ? 'Email sent successfully' : 'Email logged (add POSTMARK_API_KEY for actual sending)',
      email_sent: !!postmarkApiKey
    });

  } catch (error: any) {
    console.error('Email sender error:', error);
    return handleError(error);
  }
});