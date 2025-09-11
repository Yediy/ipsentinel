-- Create storage bucket for copyright file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('copyright-works', 'copyright-works', false)
ON CONFLICT (id) DO NOTHING;

-- Create copyright filing tables
CREATE TABLE IF NOT EXISTS public.copyrights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL,
  work_title TEXT NOT NULL,
  work_type TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  date_of_creation DATE,
  date_of_publication DATE,
  authorship_description TEXT,
  nature_of_authorship TEXT,
  owner_name TEXT NOT NULL,
  owner_address TEXT,
  owner_nationality TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.copyright_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  copyright_id UUID NOT NULL REFERENCES public.copyrights(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on copyright tables
ALTER TABLE public.copyrights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for copyrights
CREATE POLICY "Service role can manage copyrights" 
ON public.copyrights 
FOR ALL 
USING (true);

CREATE POLICY "Users can view their copyright filings" 
ON public.copyrights 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = copyrights.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

-- RLS policies for copyright_uploads
CREATE POLICY "Service role can manage copyright uploads" 
ON public.copyright_uploads 
FOR ALL 
USING (true);

CREATE POLICY "Users can view their copyright uploads" 
ON public.copyright_uploads 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.copyrights c
    JOIN public.filings f ON f.id = c.filing_id
    WHERE c.id = copyright_uploads.copyright_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

-- Storage policies for copyright works bucket
CREATE POLICY "Users can upload their copyright works" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'copyright-works' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their copyright works" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'copyright-works' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can manage copyright works" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'copyright-works');

-- Add updated_at trigger for copyrights
CREATE TRIGGER update_copyrights_updated_at
  BEFORE UPDATE ON public.copyrights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert copyright AI prompt templates
INSERT INTO public.ai_prompt_templates (template_name, template_type, section_type, prompt_text, input_variables, is_active) VALUES
(
  'copyright_work_classification',
  'copyright',
  'classification',
  'You are a U.S. Copyright Office specialist. Based on the file information and description provided, determine the correct category of copyright work according to U.S. Copyright Office classification.

File Information:
- Filename: {{filename}}
- File Type: {{file_type}}
- File Size: {{file_size}}
- Description: {{description}}

Return ONLY a JSON object with this exact structure:
{
  "work_type": "Literary Work" | "Visual Arts Work" | "Motion Picture" | "Sound Recording" | "Musical Work" | "Dramatic Work" | "Computer Program" | "Compilation",
  "explanation": "Brief explanation of why this classification was chosen",
  "nature_of_authorship": "Specific description of the creative contribution (e.g., ''Text'', ''Artwork'', ''Music and lyrics'', ''Computer program text'')"
}',
  '["filename", "file_type", "file_size", "description"]',
  true
),
(
  'copyright_authorship_description',
  'copyright', 
  'authorship',
  'You are assisting with U.S. copyright registration. Based on the work details provided, generate a clear description of the nature of authorship suitable for Form CO.

Work Details:
- Work Type: {{work_type}}
- Work Title: {{work_title}}
- Author Role: {{author_role}}
- Creative Contribution: {{creative_contribution}}

Provide a concise, Copyright Office-compliant description of what the author created. Use standard terminology like "Text", "Artwork", "Music", "Lyrics", "Photography", "Computer program text", etc.

Return only the authorship description text, nothing else.',
  '["work_type", "work_title", "author_role", "creative_contribution"]',
  true
),
(
  'copyright_form_co_generator',
  'copyright',
  'form_generation',
  'You are generating a complete U.S. Copyright Office Form CO application. Based on the provided information, create a structured form ready for submission.

Work Information:
- Title: {{work_title}}
- Work Type: {{work_type}}
- Nature of Authorship: {{nature_of_authorship}}
- Author Name: {{author_name}}
- Author Nationality: {{author_nationality}}
- Year of Creation: {{year_of_creation}}
- Year of Publication: {{year_of_publication}}
- Publication Status: {{publication_status}}
- Owner Name: {{owner_name}}
- Owner Address: {{owner_address}}

Return a JSON object with Form CO sections:
{
  "application_type": "Form CO",
  "work_title": "{{work_title}}",
  "work_classification": "{{work_type}}",
  "authorship_claim": "Description of authorship for Form CO",
  "creation_info": {
    "year_of_creation": "YYYY",
    "date_of_publication": "MM/DD/YYYY or null",
    "publication_status": "Published" or "Unpublished"
  },
  "claimant_info": {
    "name": "{{owner_name}}",
    "address": "{{owner_address}}"
  },
  "author_info": {
    "name": "{{author_name}}",
    "nationality": "{{author_nationality}}"
  },
  "rights_and_permissions": "Statement of rights being claimed",
  "filing_fee": "Standard filing fee information"
}',
  '["work_title", "work_type", "nature_of_authorship", "author_name", "author_nationality", "year_of_creation", "year_of_publication", "publication_status", "owner_name", "owner_address"]',
  true
)
ON CONFLICT (template_name) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  input_variables = EXCLUDED.input_variables,
  updated_at = now();