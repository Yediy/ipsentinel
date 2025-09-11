-- Advanced Patent and Trademark Filing Schema
-- Add patent-specific tables
CREATE TABLE public.patent_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL REFERENCES public.filings(id),
  section_type TEXT NOT NULL CHECK (
    section_type IN (
      'abstract',
      'background', 
      'claims',
      'summary',
      'detailed_description',
      'drawings_description',
      'invention_title',
      'field_of_invention'
    )
  ),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT true,
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trademark-specific tables
CREATE TABLE public.trademark_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL REFERENCES public.filings(id),
  mark_name TEXT NOT NULL,
  mark_type TEXT NOT NULL CHECK (mark_type IN ('word', 'design', 'sound', 'composite')),
  goods_services TEXT NOT NULL,
  international_classes JSONB,
  filing_basis TEXT NOT NULL CHECK (filing_basis IN ('1a_use_in_commerce', '1b_intent_to_use')),
  owner_entity TEXT NOT NULL,
  clearance_status TEXT DEFAULT 'pending',
  risk_assessment JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AI session logs for conversational filing
CREATE TABLE public.ai_filing_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL REFERENCES public.filings(id),
  session_type TEXT NOT NULL CHECK (session_type IN ('patent_interview', 'trademark_interview', 'copyright_interview')),
  conversation_log JSONB NOT NULL DEFAULT '[]',
  current_step TEXT DEFAULT 'start',
  completion_status TEXT DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),
  ai_model_used TEXT DEFAULT 'claude-sonnet-4',
  total_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trademark clearance search logs
CREATE TABLE public.trademark_clearance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL REFERENCES public.filings(id),
  searched_term TEXT NOT NULL,
  search_results JSONB,
  similarity_matches JSONB,
  risk_score DECIMAL(3,2) DEFAULT 0.00,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  recommendations TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AI prompt templates table for dynamic prompt management
CREATE TABLE public.ai_prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK (template_type IN ('patent', 'trademark', 'copyright')),
  section_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  input_variables JSONB NOT NULL DEFAULT '[]',
  model_parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.patent_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_filing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_clearance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for patent sections
CREATE POLICY "Users can view patent sections for their filings" 
ON public.patent_sections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM filings f 
    WHERE f.id = patent_sections.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

CREATE POLICY "Service role can manage patent sections" 
ON public.patent_sections 
FOR ALL 
USING (true);

-- Create policies for trademark sections
CREATE POLICY "Users can view trademark sections for their filings" 
ON public.trademark_sections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM filings f 
    WHERE f.id = trademark_sections.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

CREATE POLICY "Service role can manage trademark sections" 
ON public.trademark_sections 
FOR ALL 
USING (true);

-- Create policies for AI sessions
CREATE POLICY "Users can view their AI sessions" 
ON public.ai_filing_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM filings f 
    WHERE f.id = ai_filing_sessions.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

CREATE POLICY "Service role can manage AI sessions" 
ON public.ai_filing_sessions 
FOR ALL 
USING (true);

-- Create policies for clearance logs
CREATE POLICY "Users can view clearance logs for their filings" 
ON public.trademark_clearance_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM filings f 
    WHERE f.id = trademark_clearance_logs.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

CREATE POLICY "Service role can manage clearance logs" 
ON public.trademark_clearance_logs 
FOR ALL 
USING (true);

-- Create policies for AI prompt templates (admin only)
CREATE POLICY "Service role can manage prompt templates" 
ON public.ai_prompt_templates 
FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_patent_sections_updated_at
  BEFORE UPDATE ON public.patent_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trademark_sections_updated_at
  BEFORE UPDATE ON public.trademark_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_filing_sessions_updated_at
  BEFORE UPDATE ON public.ai_filing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI prompt templates
INSERT INTO public.ai_prompt_templates (template_name, template_type, section_type, prompt_text, input_variables) VALUES
('patent_abstract_generator', 'patent', 'abstract', 'You are a patent specialist. Generate a 150-word abstract summarizing this invention clearly and concisely using USPTO formatting. This should be a single paragraph that provides a complete yet concise technical disclosure of the invention.

Invention Details:
- Title: {{title}}
- Summary: {{summary}}
- Problem Solved: {{problem}}
- How it Works: {{mechanism}}
- Key Components: {{components}}

Write a professional patent abstract that includes the technical field, the problem addressed, the solution provided, and the key advantages. Use present tense and avoid marketing language.', '["title", "summary", "problem", "mechanism", "components"]'),

('patent_background_generator', 'patent', 'background', 'Write a "Background of the Invention" section for a patent application. This section should establish the technical field, describe the current state of the art, identify problems with existing solutions, and set up the need for the invention.

Structure:
1. Field of the Invention (1 sentence)
2. Description of Related Art (2-3 paragraphs)
3. Problems with existing solutions
4. Brief transition to the invention

Input Details:
- Technical Field: {{technical_field}}
- Problem: {{problem}}
- Existing Solutions: {{existing_solutions}}
- Limitations of Prior Art: {{limitations}}

Use formal technical language and avoid stating what the invention does in this section.', '["technical_field", "problem", "existing_solutions", "limitations"]'),

('patent_claims_generator', 'patent', 'claims', 'Generate patent claims following USPTO requirements. Create 1 independent claim and 3-5 dependent claims using proper claim structure and language.

Requirements:
- Start with "What is claimed is:"
- Use single-sentence format for each claim
- Independent claim should be broad but novel
- Dependent claims should narrow the scope
- Use proper antecedent basis (a, the, said)
- Follow 35 U.S.C. §112 requirements

Invention Details:
- Core Innovation: {{core_innovation}}
- Key Elements: {{key_elements}}
- Optional Features: {{optional_features}}
- Technical Advantages: {{advantages}}

Format as numbered claims with proper legal language.', '["core_innovation", "key_elements", "optional_features", "advantages"]'),

('trademark_mark_description', 'trademark', 'mark_description', 'You are a trademark examiner assistant. Create a clear, accurate description of the trademark for USPTO filing purposes.

Mark Information:
- Mark Name/Text: {{mark_name}}
- Mark Type: {{mark_type}}
- Design Elements: {{design_elements}}
- Colors: {{colors}}
- Stylization: {{stylization}}

For word marks: Describe any stylization, font, or design elements.
For design marks: Provide detailed visual description of all elements.
For composite marks: Describe both word and design elements.

Use present tense and be factual, not interpretive.', '["mark_name", "mark_type", "design_elements", "colors", "stylization"]'),

('trademark_goods_services_classifier', 'trademark', 'classification', 'Based on the business activity described, suggest appropriate USPTO International Classes and provide USPTO-compliant identification of goods/services.

Business Information:
- Business Activity: {{business_activity}}
- Industry: {{industry}}
- Products/Services: {{products_services}}
- Target Market: {{target_market}}

Provide:
1. Suggested International Class numbers
2. Proper identification language for each class
3. Explanation of why each class applies
4. Any additional classes to consider

Follow USPTO guidelines for acceptable identification language.', '["business_activity", "industry", "products_services", "target_market"]');