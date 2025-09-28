import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running deadline reminder job...');

    // Find deadlines due in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: upcomingDeadlines, error: deadlineError } = await supabase
      .from('deadlines')
      .select(`
        id,
        filing_id,
        label,
        due_on,
        filings!inner(
          id,
          user_id,
          contact_email,
          title,
          country_code,
          type
        )
      `)
      .eq('done', false)
      .gte('due_on', new Date().toISOString().split('T')[0])
      .lte('due_on', thirtyDaysFromNow.toISOString().split('T')[0]);

    if (deadlineError) {
      console.error('Error fetching deadlines:', deadlineError);
      throw deadlineError;
    }

    console.log(`Found ${upcomingDeadlines?.length || 0} upcoming deadlines`);

    let emailsSent = 0;
    const emailSenderUrl = Deno.env.get('EMAIL_SENDER_URL');

    for (const deadline of upcomingDeadlines || []) {
      const filing = deadline.filings as any;
      const daysUntilDue = Math.ceil((new Date(deadline.due_on).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine recipient email
      const recipientEmail = filing.contact_email || 'user@example.com'; // fallback
      
      // Create reminder email
      const emailHtml = `
        <h2>IPGenie Deadline Reminder</h2>
        <p>You have an upcoming deadline for your ${filing.type} filing:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${filing.title}</h3>
          <p><strong>Deadline:</strong> ${deadline.label}</p>
          <p><strong>Due Date:</strong> ${new Date(deadline.due_on).toLocaleDateString()}</p>
          <p><strong>Days Remaining:</strong> ${daysUntilDue}</p>
          <p><strong>Country:</strong> ${filing.country_code}</p>
        </div>
        
        <p>Please ensure you take appropriate action before this deadline.</p>
        
        <p>Best regards,<br>IPGenie Team</p>
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated reminder. Please log into your IPGenie dashboard for more details.
        </p>
      `;

      if (emailSenderUrl) {
        try {
          const emailResponse = await fetch(emailSenderUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: recipientEmail,
              subject: `Deadline Reminder: ${deadline.label} (${daysUntilDue} days remaining)`,
              html: emailHtml,
              filing_id: filing.id,
              notification_type: 'deadline_reminder'
            })
          });

          if (emailResponse.ok) {
            emailsSent++;
            console.log(`Reminder sent for deadline ${deadline.id} to ${recipientEmail}`);
          } else {
            console.error(`Failed to send reminder for deadline ${deadline.id}`);
          }
        } catch (emailError) {
          console.error(`Error sending email for deadline ${deadline.id}:`, emailError);
        }
      } else {
        // Just create notification if no email service
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: filing.user_id,
            filing_id: filing.id,
            type: 'deadline_reminder',
            title: `Deadline Reminder: ${deadline.label}`,
            message: `${deadline.label} is due in ${daysUntilDue} days (${new Date(deadline.due_on).toLocaleDateString()})`,
            read: false
          });

        if (!notifError) {
          emailsSent++; // count as processed
        }
      }
    }

    console.log(`Deadline reminder job completed. Processed ${emailsSent} reminders.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${emailsSent} deadline reminders`,
        deadlines_found: upcomingDeadlines?.length || 0,
        emails_sent: emailsSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Deadline reminder error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});