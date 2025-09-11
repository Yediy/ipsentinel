import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock U.S. Copyright Office API integration
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, filing_id, data } = await req.json();
    console.log(`USCO API action: ${action} for filing ${filing_id}`);

    let result;
    
    switch (action) {
      case 'submit_registration':
        result = await submitCopyrightRegistration(supabase, filing_id, data);
        break;
      case 'check_status':
        result = await checkRegistrationStatus(filing_id);
        break;
      case 'validate_work':
        result = await validateCopyrightWork(data);
        break;
      case 'search_records':
        result = await searchCopyrightRecords(data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log API interaction
    await supabase
      .from('api_logs')
      .insert({
        filing_id,
        api_type: 'usco',
        request_data: { action, data },
        response_data: result,
        status: 'success'
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('USCO API error:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log error
    const requestBody = await req.json().catch(() => ({}));
    await supabase
      .from('api_logs')
      .insert({
        filing_id: requestBody.filing_id || null,
        api_type: 'usco',
        request_data: requestBody,
        response_data: { error: error.message },
        status: 'error',
        error_message: error.message
      });

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function submitCopyrightRegistration(supabase: any, filing_id: string, registrationData: any) {
  console.log('Submitting copyright registration to USCO:', filing_id);
  
  // Generate mock registration details
  const registrationNumber = `TX${Math.floor(Math.random() * 9000000 + 1000000)}`;
  const serviceRequestNumber = `SR${Math.floor(Math.random() * 900000 + 100000)}`;
  
  // Update filing status in database
  await supabase
    .from('filings')
    .update({ 
      status: 'submitted',
      generated_content: {
        ...registrationData,
        usco_registration_number: registrationNumber,
        service_request_number: serviceRequestNumber,
        submission_date: new Date().toISOString(),
        effective_date: new Date().toISOString()
      }
    })
    .eq('id', filing_id);

  // Create notification
  await supabase
    .from('notifications')
    .insert({
      filing_id,
      type: 'submission_success',
      title: 'Copyright Registration Submitted',
      message: `Your copyright registration has been submitted with service request number ${serviceRequestNumber}`,
    });

  return {
    success: true,
    registration_number: registrationNumber,
    service_request_number: serviceRequestNumber,
    status: 'submitted',
    effective_date: new Date().toISOString(),
    certificate_url: `https://cocatalog.loc.gov/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search%5FArg=${registrationNumber}`,
    estimated_processing_time: '4-6 months'
  };
}

async function checkRegistrationStatus(filing_id: string) {
  console.log('Checking copyright registration status:', filing_id);
  
  // Mock status options
  const statuses = [
    'Received',
    'Under Review',
    'Correspondence Required',
    'Registered',
    'Refused'
  ];
  
  const randomStatus = statuses[Math.floor(Math.random() * 3)]; // Bias towards early statuses
  
  return {
    success: true,
    status: randomStatus,
    last_updated: new Date().toISOString(),
    case_number: `1-${Math.floor(Math.random() * 900000000 + 100000000)}`,
    examiner: "Copyright Office Staff",
    next_action: randomStatus === 'Correspondence Required' 
      ? 'Response to office correspondence required within 30 days'
      : 'No action required - processing continues'
  };
}

async function validateCopyrightWork(workData: any) {
  console.log('Validating copyright work data');
  
  const issues = [];
  
  // Mock validation checks
  if (!workData.title || workData.title.length < 2) {
    issues.push({
      type: 'error',
      field: 'title',
      message: 'Work title is required and must be at least 2 characters'
    });
  }
  
  if (!workData.author_name) {
    issues.push({
      type: 'error',
      field: 'author_name',
      message: 'Author name is required'
    });
  }
  
  if (!workData.work_type || !['literary', 'visual', 'performing_arts', 'sound_recording'].includes(workData.work_type)) {
    issues.push({
      type: 'error',
      field: 'work_type',
      message: 'Valid work type must be specified'
    });
  }
  
  if (!workData.creation_date) {
    issues.push({
      type: 'warning',
      field: 'creation_date',
      message: 'Creation date helps establish copyright timeline'
    });
  }
  
  return {
    success: true,
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    estimated_registration_time: '4-6 months',
    estimated_cost: {
      government_fee: 65,
      service_fee: 49,
      total: 114
    },
    recommendations: [
      'Include deposit copy of the work',
      'Provide detailed description of the work',
      'Ensure all author information is complete'
    ]
  };
}

async function searchCopyrightRecords(searchData: any) {
  console.log('Searching copyright records:', searchData);
  
  // Mock search results
  const mockResults = [
    {
      registration_number: "TX0008765432",
      title: searchData.title ? `Similar work to "${searchData.title}"` : "Example Literary Work",
      author: "John Author",
      registration_date: "2021-05-15",
      work_type: "Literary work",
      claimant: "Publishing Company LLC"
    },
    {
      registration_number: "VA0001234567", 
      title: "Related Visual Work",
      author: "Jane Artist",
      registration_date: "2020-11-03",
      work_type: "Visual arts work",
      claimant: "Independent Artist"
    }
  ];
  
  return {
    success: true,
    results: mockResults,
    total_found: mockResults.length,
    search_query: searchData,
    note: "Search results are from publicly available Copyright Office records"
  };
}