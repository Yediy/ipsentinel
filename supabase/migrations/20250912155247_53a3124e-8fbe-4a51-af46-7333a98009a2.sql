-- Create enhanced IPGenie schema for patent automation

-- Create profiles table if not exists (for user management)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create filing_sections table for modular patent content
CREATE TABLE IF NOT EXISTS public.filing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL CHECK (section_key IN ('title','abstract','background','summary','detailed_description','claims','features','prior_art')),
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create documents table for generated files
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  document_kind TEXT NOT NULL CHECK (document_kind IN ('pdf','docx','xml')),
  file_url TEXT NOT NULL,
  file_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create deadlines table for tracking important dates
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for filing_sections
CREATE POLICY "Users can view their filing sections" ON public.filing_sections
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.filings f 
          WHERE f.id = filing_sections.filing_id 
          AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL))))
);

CREATE POLICY "Service role can manage filing sections" ON public.filing_sections
FOR ALL USING (true);

-- Create RLS policies for documents
CREATE POLICY "Users can view their documents" ON public.documents
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.filings f 
          WHERE f.id = documents.filing_id 
          AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL))))
);

CREATE POLICY "Service role can manage documents" ON public.documents
FOR ALL USING (true);

-- Create RLS policies for deadlines
CREATE POLICY "Users can view their deadlines" ON public.deadlines
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.filings f 
          WHERE f.id = deadlines.filing_id 
          AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL))))
);

CREATE POLICY "Users can manage their deadlines" ON public.deadlines
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.filings f 
          WHERE f.id = deadlines.filing_id 
          AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL))))
);

-- Create trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filing_sections_updated_at
  BEFORE UPDATE ON public.filing_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();