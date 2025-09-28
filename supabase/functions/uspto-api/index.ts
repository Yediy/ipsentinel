import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock USPTO API integration for development/testing
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
    console.log(`USPTO API action: ${action} for filing ${filing_id}`);

    let result;
    
    switch (action) {
      case 'search_prior_art':
        result = await searchPriorArt(data);
        break;
      case 'submit_application':
        result = await submitApplication(supabase, filing_id, data);
        break;
      case 'check_status':
        result = await checkFilingStatus(filing_id);
        break;
      case 'validate_application':
        result = await validateApplication(data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log API interaction
    await supabase
      .from('api_logs')
      .insert({
        filing_id,
        api_type: 'uspto',
        request_data: { action, data },
        response_data: result,
        status: 'success'
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('USPTO API error:', error);
    
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
        api_type: 'uspto',
        request_data: requestBody,
        response_data: { error: (error as any)?.message || 'USPTO API error' },
        status: 'error',
        error_message: (error as any)?.message || 'USPTO API error'
      });

    return new Response(JSON.stringify({ 
      error: (error as any)?.message || 'USPTO API failed',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchPriorArt(searchData: any) {
  console.log('Searching prior art:', searchData);
  
  // Mock prior art search results
  const mockResults = [
    {
      patent_number: "US10,123,456",
      title: "Similar Invention Method",
      inventors: ["John Smith", "Jane Doe"],
      filing_date: "2020-03-15",
      relevance_score: 0.85,
      abstract: "A method for achieving similar functionality through different means..."
    },
    {
      patent_number: "US9,987,654",
      title: "Related Technology System", 
      inventors: ["Alice Johnson"],
      filing_date: "2019-08-22",
      relevance_score: 0.72,
      abstract: "A system that uses comparable techniques for solving related problems..."
    }
  ];

  return {
    success: true,
    results: mockResults,
    total_found: mockResults.length,
    search_query: searchData.query
  };
}

async function submitApplication(supabase: any, filing_id: string, applicationData: any) {
  console.log('Submitting application to USPTO:', filing_id);
  
  // Generate mock application number
  const applicationNumber = `16/${Math.floor(Math.random() * 900000 + 100000)}`;
  const confirmationNumber = `USPTO-${Date.now()}`;
  
  // Update filing status in database
  await supabase
    .from('filings')
    .update({ 
      status: 'submitted',
      generated_content: {
        ...applicationData,
        uspto_application_number: applicationNumber,
        confirmation_number: confirmationNumber,
        submission_date: new Date().toISOString()
      }
    })
    .eq('id', filing_id);

  // Create notification
  await supabase
    .from('notifications')
    .insert({
      filing_id,
      type: 'submission_success',
      title: 'Application Submitted Successfully',
      message: `Your patent application has been submitted to USPTO with application number ${applicationNumber}`,
    });

  return {
    success: true,
    application_number: applicationNumber,
    confirmation_number: confirmationNumber,
    status: 'submitted',
    estimated_first_office_action: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 18 months from now
    filing_receipt: `https://uspto.gov/receipt/${confirmationNumber}`
  };
}

async function checkFilingStatus(filing_id: string) {
  console.log('Checking filing status:', filing_id);
  
  // Mock status check - in real implementation, this would query USPTO database
  const statuses = [
    'Application Received',
    'Under Examination', 
    'Office Action Issued',
    'Response Filed',
    'Patent Granted',
    'Application Abandoned'
  ];
  
  const randomStatus = statuses[Math.floor(Math.random() * 3)]; // Bias towards early statuses
  
  return {
    success: true,
    status: randomStatus,
    last_updated: new Date().toISOString(),
    next_deadline: randomStatus === 'Office Action Issued' 
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days to respond
      : null,
    examiner_name: "Jane Smith",
    art_unit: "3600"
  };
}

async function validateApplication(applicationData: any) {
  console.log('Validating application data');
  
  const issues = [];
  
  // Mock validation checks
  if (!applicationData.title || applicationData.title.length < 10) {
    issues.push({
      type: 'error',
      field: 'title',
      message: 'Title must be at least 10 characters long'
    });
  }
  
  if (!applicationData.abstract || applicationData.abstract.length < 150) {
    issues.push({
      type: 'warning',
      field: 'abstract', 
      message: 'Abstract should be at least 150 characters for best results'
    });
  }
  
  if (!applicationData.claims || applicationData.claims.length === 0) {
    issues.push({
      type: 'error',
      field: 'claims',
      message: 'At least one claim is required'
    });
  }
  
  return {
    success: true,
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    estimated_filing_time: '2-3 business days',
    estimated_cost: {
      government_fee: 1600,
      service_fee: 149,
      total: 1749
    }
  };
}