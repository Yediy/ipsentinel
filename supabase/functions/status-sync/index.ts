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
        } else {
          updatedCount++;
          console.log(`Updated status for filing ${filing.id}`);
        }
      } catch (error) {
        console.error(`Error processing filing ${filing.id}:`, error);
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
