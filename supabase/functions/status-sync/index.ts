import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse, handleCorsPreFlight } from '../_shared/security-headers.ts';
import { handleError } from '../_shared/error-handler.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running trademark status sync job...');

    // Fetch trademark filings with US serial numbers
    const { data: filings, error: filingsError } = await supabase
      .from('filings')
      .select('id, user_id, tm_mark_text, country_code')
      .eq('type', 'trademark')
      .eq('country_code', 'US')
      .not('tm_mark_text', 'is', null);

    if (filingsError) {
      console.error('Error fetching filings:', filingsError);
      throw filingsError;
    }

    console.log(`Found ${filings?.length || 0} trademark filings to check`);

    let updatedCount = 0;

    for (const filing of filings || []) {
      try {
        // Call the TSDR function to get status
        const { data: tsdrData, error: tsdrError } = await supabase.functions.invoke('tm-tsdr', {
          body: { serialNumber: filing.tm_mark_text }
        });

        if (tsdrError || !tsdrData?.success) {
          console.log(`No status found for filing ${filing.id}`);
          
          // Log to audit if there was an error (not just no data)
          if (tsdrError) {
            await supabase.from('audit_log').insert({
              action: 'status_sync_error',
              subject_type: 'filing',
              subject_id: filing.id,
              user_id: filing.user_id,
              metadata: {
                serial: filing.tm_mark_text,
                error: tsdrError.message || String(tsdrError)
              }
            }).catch(err => console.error('Failed to log audit:', err));
          }
          
          continue;
        }

        // Update filing with status information
        const { error: updateError } = await supabase
          .from('filings')
          .update({
            status: tsdrData.data?.status || filing.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', filing.id);

        if (updateError) {
          console.error(`Failed to update filing ${filing.id}:`, updateError);
          
          await supabase.from('audit_log').insert({
            action: 'status_sync_update_error',
            subject_type: 'filing',
            subject_id: filing.id,
            user_id: filing.user_id,
            metadata: {
              error: updateError.message || String(updateError)
            }
          }).catch(err => console.error('Failed to log audit:', err));
        } else {
          updatedCount++;
          console.log(`Updated status for filing ${filing.id}`);
        }
      } catch (error: any) {
        console.error(`Error processing filing ${filing.id}:`, error);
        
        await supabase.from('audit_log').insert({
          action: 'status_sync_exception',
          subject_type: 'filing',
          subject_id: filing.id,
          user_id: filing.user_id,
          metadata: {
            error: error.message || String(error)
          }
        }).catch(err => console.error('Failed to log audit:', err));
      }
    }

    console.log(`Status sync completed. Updated ${updatedCount} filings.`);

    return createSecureResponse({
      success: true,
      message: `Updated ${updatedCount} trademark statuses`,
      filings_checked: filings?.length || 0,
      updated_count: updatedCount
    });

  } catch (error: any) {
    console.error('Status sync error:', error);
    return handleError(error);
  }
});
