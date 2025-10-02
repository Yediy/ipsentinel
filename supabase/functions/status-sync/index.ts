import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createSecureResponse, handleCorsPreFlight } from '../_shared/security-headers.ts';
import { handleError } from '../_shared/error-handler.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // Require authentication (admin only for sync jobs)
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

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Check if user has admin role
    const { data: roleData } = await authClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Use service role for sync operations
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
            await supabase.rpc('audit_log_append', {
              p_user_id: filing.user_id,
              p_action: 'status_sync_error',
              p_subject_type: 'filing',
              p_subject_id: filing.id,
              p_metadata: {
                serial: filing.tm_mark_text,
                error: tsdrError.message || String(tsdrError)
              },
              p_ip: null,
              p_ua: null
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
          
          await supabase.rpc('audit_log_append', {
            p_user_id: filing.user_id,
            p_action: 'status_sync_update_error',
            p_subject_type: 'filing',
            p_subject_id: filing.id,
            p_metadata: {
              error: updateError.message || String(updateError)
            },
            p_ip: null,
            p_ua: null
          }).catch(err => console.error('Failed to log audit:', err));
        } else {
          updatedCount++;
          console.log(`Updated status for filing ${filing.id}`);
        }
      } catch (error: any) {
        console.error(`Error processing filing ${filing.id}:`, error);
        
        await supabase.rpc('audit_log_append', {
          p_user_id: filing.user_id,
          p_action: 'status_sync_exception',
          p_subject_type: 'filing',
          p_subject_id: filing.id,
          p_metadata: {
            error: error.message || String(error)
          },
          p_ip: null,
          p_ua: null
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
