// supabase/functions/deadline-reminder/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createSecureResponse } from '../_shared/security-headers.ts';
import { handleError } from '../_shared/error-handler.ts';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from '../_shared/cors-validator.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const POSTMARK_TOKEN = Deno.env.get("POSTMARK_TOKEN");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM");

interface PendingDeadline {
  id: string;
  user_id: string;
  filing_id: string;
  due_at: string;
  title: string | null;
  email: string | null;
}

async function sendEmailPostmark(to: string, subject: string, textBody: string, htmlBody?: string) {
  if (!POSTMARK_TOKEN || !EMAIL_FROM) {
    console.log("Postmark not configured, skipping direct email");
    return false;
  }
  
  const resp = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": POSTMARK_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      From: EMAIL_FROM,
      To: to,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: "outbound"
    })
  });
  if (!resp.ok) {
    const e = await resp.text();
    console.error("Postmark error", e);
    return false;
  }
  return true;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Require service-role key authentication (cron job or admin only)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    console.log('Running deadline reminder job...');

    // Use the new RPC function for pending deadlines
    const { data, error } = await supabase.rpc("pending_deadlines_window", { p_days_ahead: 7 });
    if (error) {
      console.error('Error fetching deadlines:', error);
      throw error;
    }

    const rows = (data as PendingDeadline[]) ?? [];
    console.log(`Found ${rows.length} upcoming deadlines`);

    let emailsSent = 0;
    let skippedDueToPrefs = 0;

    for (const d of rows) {
      if (!d.email) {
        console.log(`No email for deadline ${d.id}, skipping`);
        continue;
      }

      const daysUntilDue = Math.ceil((new Date(d.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      // Check user preferences for deadline reminders
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('email_notifications, deadline_reminders, reminder_days_before')
        .eq('user_id', d.user_id)
        .maybeSingle();

      // Default preferences if not set
      const emailNotifications = preferences?.email_notifications ?? true;
      const deadlineReminders = preferences?.deadline_reminders ?? true;
      const reminderDaysBefore = preferences?.reminder_days_before ?? 7;

      // Skip if user has disabled email notifications or deadline reminders
      if (!emailNotifications || !deadlineReminders) {
        console.log(`User ${d.user_id} has disabled deadline reminders, skipping`);
        skippedDueToPrefs++;
        continue;
      }

      // Skip if deadline is further out than user's reminder preference
      if (daysUntilDue > reminderDaysBefore) {
        console.log(`Deadline ${d.id} is ${daysUntilDue} days out, user preference is ${reminderDaysBefore} days, skipping`);
        continue;
      }

      const subject = `Reminder: ${d.title ?? "IP Deadline"} on ${new Date(d.due_at).toLocaleDateString()}`;
      const textBody = `Heads up —
Your deadline "${d.title ?? "IP Deadline"}" is due on ${new Date(d.due_at).toUTCString()}.
Log in to IPSentinel to confirm submission steps or reschedule tasks.
This is an automated reminder.`;

      const htmlBody = `
        <h2>IPSentinel Deadline Reminder</h2>
        <p>You have an upcoming deadline:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${d.title ?? "IP Deadline"}</h3>
          <p><strong>Due Date:</strong> ${new Date(d.due_at).toLocaleDateString()}</p>
          <p><strong>Days Remaining:</strong> ${daysUntilDue}</p>
        </div>
        
        <p>Please ensure you take appropriate action before this deadline.</p>
        
        <p>Best regards,<br>IPSentinel Team</p>
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated reminder. You can manage your notification preferences in the Settings page.
        </p>
      `;

      let emailSent = false;
      
      // Try Postmark first if configured
      if (POSTMARK_TOKEN && EMAIL_FROM) {
        emailSent = await sendEmailPostmark(d.email, subject, textBody, htmlBody);
      }
      
      // Fall back to email-sender function
      if (!emailSent) {
        try {
          const { error: emailError } = await supabase.functions.invoke('email-sender', {
            body: {
              to: d.email,
              subject,
              html: htmlBody,
              filing_id: d.filing_id,
              notification_type: 'deadline_reminder'
            }
          });
          emailSent = !emailError;
          if (emailError) {
            console.error(`Failed to send email for deadline ${d.id}:`, emailError);
          }
        } catch (err) {
          console.error(`Error invoking email-sender for deadline ${d.id}:`, err);
        }
      }

      if (emailSent) {
        emailsSent++;
        console.log(`Reminder sent for deadline ${d.id} to ${d.email}`);
      }

      // Create in-app notification using notify_user RPC
      await supabase.rpc("notify_user", {
        p_user_id: d.user_id,
        p_filing_id: d.filing_id,
        p_subject: subject,
        p_body: "We sent you an email reminder and created this in-app reminder."
      });

      // Log to audit
      await supabase
        .from('audit_log')
        .insert({
          user_id: d.user_id,
          action: emailSent ? 'deadline_email_sent' : 'deadline_email_failed',
          subject_type: 'deadline',
          subject_id: d.id,
          metadata: {
            to: d.email,
            deadline_title: d.title,
            days_until_due: daysUntilDue
          }
        }).catch(err => console.error('Failed to log audit:', err));
    }

    console.log(`Deadline reminder job completed. Sent ${emailsSent}, skipped ${skippedDueToPrefs} due to preferences.`);

    return createSecureResponse({
      ok: true,
      success: true,
      message: `Processed ${emailsSent} deadline reminders`,
      deadlines_found: rows.length,
      emails_sent: emailsSent,
      skipped_due_to_preferences: skippedDueToPrefs
    }, 200, corsHeaders);

  } catch (error: any) {
    console.error('Deadline reminder error:', error);
    return handleError(error, corsHeaders);
  }
});
