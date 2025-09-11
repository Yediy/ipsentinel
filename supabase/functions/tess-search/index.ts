import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock USPTO TESS (Trademark Electronic Search System) integration
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
    console.log(`TESS API action: ${action} for filing ${filing_id}`);

    let result;
    
    switch (action) {
      case 'search_trademarks':
        result = await searchTrademarks(data);
        break;
      case 'detailed_search':
        result = await detailedTrademarkSearch(data);
        break;
      case 'class_lookup':
        result = await lookupTrademarkClasses(data);
        break;
      case 'availability_check':
        result = await checkTrademarkAvailability(data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log API interaction
    await supabase
      .from('api_logs')
      .insert({
        filing_id,
        api_type: 'tess',
        request_data: { action, data },
        response_data: result,
        status: 'success'
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TESS API error:', error);
    
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
        api_type: 'tess',
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

async function searchTrademarks(searchData: any) {
  console.log('Searching trademarks in TESS:', searchData);
  
  const { mark, classes } = searchData;
  
  // Mock search results based on the mark
  const similarMarks = generateSimilarMarks(mark);
  
  return {
    success: true,
    query: mark,
    results: similarMarks,
    total_found: similarMarks.length,
    search_strategy: 'exact_and_phonetic',
    recommendation: similarMarks.length > 0 
      ? 'Consider modifying your mark due to potential conflicts'
      : 'Initial search shows no obvious conflicts - proceed with detailed search'
  };
}

async function detailedTrademarkSearch(searchData: any) {
  console.log('Performing detailed trademark search:', searchData);
  
  const { mark, international_classes } = searchData;
  
  // Generate more comprehensive results
  const exactMatches = generateExactMatches(mark);
  const similarMarks = generateSimilarMarks(mark);
  const phoneticMatches = generatePhoneticMatches(mark);
  
  return {
    success: true,
    search_completed: new Date().toISOString(),
    exact_matches: exactMatches,
    similar_marks: similarMarks,
    phonetic_matches: phoneticMatches,
    total_conflicts: exactMatches.length + similarMarks.length,
    risk_assessment: {
      level: exactMatches.length > 0 ? 'high' : (similarMarks.length > 3 ? 'medium' : 'low'),
      recommendation: exactMatches.length > 0 
        ? 'High risk - exact matches found. Consider alternative mark.'
        : similarMarks.length > 3
        ? 'Medium risk - multiple similar marks. Attorney review recommended.'
        : 'Low risk - proceed with application.',
      suggested_classes: international_classes
    }
  };
}

async function lookupTrademarkClasses(searchData: any) {
  console.log('Looking up trademark classes for goods/services:', searchData);
  
  const { goods_services } = searchData;
  
  // Mock Nice Classification suggestions
  const classificationSuggestions = [
    {
      class_number: 9,
      class_description: "Scientific, research, navigation, surveying, photographic, cinematographic, audiovisual, optical, weighing, measuring, signalling, detecting, testing, inspecting, life-saving and teaching apparatus and instruments",
      relevance_score: 0.95,
      suggested_description: "Computer software applications"
    },
    {
      class_number: 42,
      class_description: "Scientific and technological services and research and design relating thereto; industrial analysis, industrial research and industrial design services; quality control and authentication services; design and development of computer hardware and software",
      relevance_score: 0.88,
      suggested_description: "Software as a service (SAAS) services"
    },
    {
      class_number: 35,
      class_description: "Advertising; business management; business administration; office functions",
      relevance_score: 0.65,
      suggested_description: "Online business services"
    }
  ];
  
  return {
    success: true,
    input_description: goods_services,
    suggested_classes: classificationSuggestions,
    filing_strategy: "Consider filing in primary class 9 with potential expansion to class 42",
    estimated_cost_per_class: 350
  };
}

async function checkTrademarkAvailability(searchData: any) {
  console.log('Checking trademark availability:', searchData);
  
  const { mark, classes } = searchData;
  
  // Simulate availability check
  const conflicts = generateConflictAnalysis(mark);
  
  return {
    success: true,
    mark_searched: mark,
    availability_status: conflicts.length === 0 ? 'available' : 'potential_conflicts',
    conflicts: conflicts,
    clearance_opinion: {
      overall_risk: conflicts.length === 0 ? 'low' : 'medium_to_high',
      recommendation: conflicts.length === 0 
        ? 'Mark appears available for registration. Proceed with application.'
        : 'Potential conflicts identified. Consider alternative mark or consult trademark attorney.',
      next_steps: conflicts.length === 0 
        ? ['File trademark application', 'Monitor for oppositions']
        : ['Modify mark', 'Conduct attorney review', 'Consider coexistence agreement']
    }
  };
}

function generateSimilarMarks(mark: string) {
  if (!mark) return [];
  
  // Generate mock similar marks
  return [
    {
      serial_number: "88123456",
      mark_text: mark + "PRO",
      owner: "Tech Corp LLC",
      status: "Registered",
      registration_number: "6123456",
      international_classes: ["009", "042"],
      similarity_score: 0.85,
      filing_date: "2020-03-15"
    },
    {
      serial_number: "87654321", 
      mark_text: mark.slice(0, -1) + "X",
      owner: "Innovation Inc",
      status: "Pending",
      registration_number: null,
      international_classes: ["009"],
      similarity_score: 0.72,
      filing_date: "2022-08-20"
    }
  ];
}

function generateExactMatches(mark: string) {
  // Usually no exact matches in mock data
  return [];
}

function generatePhoneticMatches(mark: string) {
  if (!mark) return [];
  
  return [
    {
      serial_number: "89987654",
      mark_text: mark.replace(/[aeiou]/g, 'e'), // Simple phonetic variation
      owner: "Sound Solutions LLC",
      status: "Registered", 
      phonetic_similarity: 0.78,
      international_classes: ["009"]
    }
  ];
}

function generateConflictAnalysis(mark: string) {
  if (!mark || mark.length < 3) {
    return [{
      type: 'exact_match',
      conflicting_mark: mark,
      owner: 'Existing Company',
      status: 'Registered',
      risk_level: 'high'
    }];
  }
  
  // Most marks will have some potential conflicts in mock data
  if (Math.random() > 0.3) {
    return [{
      type: 'similar_mark',
      conflicting_mark: mark + ' Systems',
      owner: 'Related Business Inc',
      status: 'Pending',
      risk_level: 'medium'
    }];
  }
  
  return []; // Clean result for some searches
}