import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse, handleCorsPreFlight } from '../_shared/security-headers.ts';
import { handleError } from '../_shared/error-handler.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // Initialize Supabase client with service role for cron job access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Service client for all operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running deadline reminder job...');

    // Find deadlines due in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    // Use service client to fetch all deadlines
    const { data: upcomingDeadlines, error: deadlineError } = await serviceClient
      .from('deadlines')
      .select(`
        id,
        filing_id,
        label,
        due_on,
        filings!inner(
          id,
          user_id,
          title,
          country_code,
          type,
          profiles:user_id (email)
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
    let skippedDueToPrefs = 0;

    for (const deadline of upcomingDeadlines || []) {
      const filing = deadline.filings as any;
      const daysUntilDue = Math.ceil((new Date(deadline.due_on).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      // Get recipient email from profile
      const recipientEmail = filing.profiles?.email;
      
      if (!recipientEmail) {
        console.log(`No email for filing ${filing.id}, skipping`);
        continue;
      }

      // Check user preferences for deadline reminders
      const { data: preferences } = await serviceClient
        .from('user_preferences')
        .select('email_notifications, deadline_reminders, reminder_days_before')
        .eq('user_id', filing.user_id)
        .maybeSingle();

      // Default preferences if not set
      const emailNotifications = preferences?.email_notifications ?? true;
      const deadlineReminders = preferences?.deadline_reminders ?? true;
      const reminderDaysBefore = preferences?.reminder_days_before ?? 7;

      // Skip if user has disabled email notifications or deadline reminders
      if (!emailNotifications || !deadlineReminders) {
        console.log(`User ${filing.user_id} has disabled deadline reminders, skipping`);
        skippedDueToPrefs++;
        continue;
      }

      // Skip if deadline is further out than user's reminder preference
      if (daysUntilDue > reminderDaysBefore) {
        console.log(`Deadline ${deadline.id} is ${daysUntilDue} days out, user preference is ${reminderDaysBefore} days, skipping`);
        continue;
      }

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
          This is an automated reminder. You can manage your notification preferences in the Settings page.
        </p>
      `;

      try {
        // Use the email-sender function via service client
        const { error: emailError } = await serviceClient.functions.invoke('email-sender', {
          body: {
            to: recipientEmail,
            subject: `Deadline Reminder: ${deadline.label} (${daysUntilDue} days remaining)`,
            html: emailHtml,
            filing_id: filing.id,
            notification_type: 'deadline_reminder'
          }
        });

        if (emailError) {
          console.error(`Failed to send email for deadline ${deadline.id}:`, emailError);
          
          // Log to audit log
          await serviceClient
            .from('audit_log')
            .insert({
              user_id: filing.user_id,
              action: 'deadline_email_error',
              subject_type: 'deadline',
              subject_id: deadline.id,
              metadata: {
                to: recipientEmail,
                error: emailError.message || String(emailError),
                deadline_label: deadline.label
              }
            });
        } else {
          emailsSent++;
          console.log(`Reminder sent for deadline ${deadline.id} to ${recipientEmail}`);
          
          // Log successful send
          await serviceClient
            .from('audit_log')
            .insert({
              user_id: filing.user_id,
              action: 'deadline_email_sent',
              subject_type: 'deadline',
              subject_id: deadline.id,
              metadata: {
                to: recipientEmail,
                deadline_label: deadline.label,
                days_until_due: daysUntilDue
              }
            });
        }
      } catch (emailError: any) {
        console.error(`Error sending email for deadline ${deadline.id}:`, emailError);
        
        // Log exception
        await serviceClient
          .from('audit_log')
          .insert({
            user_id: filing.user_id,
            action: 'deadline_email_exception',
            subject_type: 'deadline',
            subject_id: deadline.id,
            metadata: {
              to: recipientEmail,
              error: emailError.message || String(emailError)
            }
          }).catch(err => console.error('Failed to log audit:', err));
      }
    }

    console.log(`Deadline reminder job completed. Sent ${emailsSent}, skipped ${skippedDueToPrefs} due to preferences.`);

    return createSecureResponse({
      success: true,
      message: `Processed ${emailsSent} deadline reminders`,
      deadlines_found: upcomingDeadlines?.length || 0,
      emails_sent: emailsSent,
      skipped_due_to_preferences: skippedDueToPrefs
    });

  } catch (error: any) {
    console.error('Deadline reminder error:', error);
    return handleError(error);
  }
});