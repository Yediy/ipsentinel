import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { filing_id } = await req.json();
    
    if (!filing_id) {
      throw new Error('Filing ID is required');
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get filing details
    const { data: filing, error: filingError } = await supabase
      .from('filings')
      .select('*')
      .eq('id', filing_id)
      .single();

    if (filingError) throw filingError;
    if (!filing) throw new Error('Filing not found');

    console.log('Calculating deadlines for filing:', filing.id, filing.type, filing.route, filing.country);

    // Calculate deadlines based on filing type, route, and country
    const deadlines = calculateDeadlines(filing);
    
    // Remove existing auto-generated deadlines
    await supabase
      .from('deadlines')
      .delete()
      .eq('filing_id', filing_id)
      .like('label', '%deadline%');

    // Insert new calculated deadlines
    if (deadlines.length > 0) {
      const { error: insertError } = await supabase
        .from('deadlines')
        .insert(deadlines.map(d => ({
          filing_id,
          ...d
        })));

      if (insertError) throw insertError;
    }

    // Update filing with calculated deadline dates
    const updateData: any = {};
    
    if (filing.route === 'pct' && filing.priority_date) {
      updateData.pct_national_deadline = addMonths(filing.priority_date, getCountryMonths(filing.country));
    }
    
    if (filing.route === 'paris' && filing.priority_date) {
      updateData.paris_deadline = addMonths(filing.priority_date, 12);
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('filings')
        .update(updateData)
        .eq('id', filing_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deadlines_created: deadlines.length,
        deadlines
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error: any) {
    console.error('Deadline calculation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Deadline calculation failed',
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

function calculateDeadlines(filing: any) {
  const deadlines: any[] = [];
  const today = new Date();
  
  if (!filing.priority_date) {
    return deadlines; // No priority date, can't calculate deadlines
  }

  const priorityDate = new Date(filing.priority_date);

  // Patent-specific deadlines
  if (filing.type === 'patent') {
    
    // PCT Route deadlines
    if (filing.route === 'pct') {
      const countryMonths = getCountryMonths(filing.country);
      const nationalPhaseDate = addMonths(filing.priority_date, countryMonths);
      
      deadlines.push({
        label: `PCT ${filing.country} National Phase Deadline`,
        due_on: nationalPhaseDate,
        done: false
      });

      // Add warning deadline 3 months before
      const warningDate = addMonths(filing.priority_date, countryMonths - 3);
      if (new Date(warningDate) > today) {
        deadlines.push({
          label: `PCT ${filing.country} National Phase Warning (3 months)`,
          due_on: warningDate,
          done: false
        });
      }
    }

    // Paris Convention deadlines
    if (filing.route === 'paris') {
      const parisDate = addMonths(filing.priority_date, 12);
      
      deadlines.push({
        label: `Paris Convention Filing Deadline`,
        due_on: parisDate,
        done: false
      });

      // Add warning deadline 2 months before
      const warningDate = addMonths(filing.priority_date, 10);
      if (new Date(warningDate) > today) {
        deadlines.push({
          label: `Paris Convention Warning (2 months)`,
          due_on: warningDate,
          done: false
        });
      }
    }

    // China-specific deadlines
    if (filing.country === 'CN') {
      // Examination request deadline for invention patents
      if (filing.cn_type === 'invention') {
        const examDate = addMonths(filing.priority_date, 36); // 3 years
        deadlines.push({
          label: `CN Invention Patent Examination Request Deadline`,
          due_on: examDate,
          done: false
        });
      }
    }

    // US-specific deadlines
    if (filing.country === 'US') {
      // IDS submission deadlines at various stages
      const idsDate1 = addMonths(filing.priority_date, 3);
      const idsDate2 = addMonths(filing.priority_date, 6);
      
      if (new Date(idsDate1) > today) {
        deadlines.push({
          label: `US IDS Submission Window (3 months)`,
          due_on: idsDate1,
          done: false
        });
      }
      
      if (new Date(idsDate2) > today) {
        deadlines.push({
          label: `US IDS Submission Window (6 months)`,
          due_on: idsDate2,
          done: false
        });
      }
    }
  }

  // Trademark-specific deadlines
  if (filing.type === 'trademark') {
    
    // Madrid System deadlines
    if (filing.route === 'madrid') {
      // Based on home application/registration
      const madridDate = addMonths(filing.priority_date, 6); // 6 months from home filing
      
      deadlines.push({
        label: `Madrid International Application Deadline`,
        due_on: madridDate,
        done: false
      });
    }

    // Use-based requirements (US)
    if (filing.country === 'US') {
      const useDate = addMonths(filing.priority_date, 6);
      deadlines.push({
        label: `US Trademark Use Evidence Deadline`,
        due_on: useDate,
        done: false
      });
    }
  }

  return deadlines;
}

function getCountryMonths(countryCode: string): number {
  const countryMonths: { [key: string]: number } = {
    'CN': 30,
    'EP': 31, 
    'GB': 31,
    'JP': 30,
    'KR': 31,
    'US': 30,
    'CA': 30,
    'AU': 31
  };
  
  return countryMonths[countryCode] || 30; // Default to 30 months
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}