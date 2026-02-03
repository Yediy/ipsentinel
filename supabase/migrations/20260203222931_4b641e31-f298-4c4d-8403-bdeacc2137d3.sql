-- Create intakes table for provisional patent wizard answers
CREATE TABLE public.intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filing_id uuid REFERENCES public.filings(id) ON DELETE CASCADE,
  wizard_version text NOT NULL DEFAULT 'v1.0',
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score numeric(4,3),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz NOT NULL DEFAULT (now() + interval '72 hours')
);

-- Create generation_jobs table for async document generation
CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid REFERENCES public.intakes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add delete_after column to existing documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS delete_after timestamptz;

-- Create indexes for performance
CREATE INDEX idx_intakes_user_id ON public.intakes(user_id);
CREATE INDEX idx_intakes_delete_after ON public.intakes(delete_after);
CREATE INDEX idx_intakes_filing_id ON public.intakes(filing_id);
CREATE INDEX idx_documents_delete_after ON public.documents(delete_after) WHERE delete_after IS NOT NULL;
CREATE INDEX idx_generation_jobs_intake_id ON public.generation_jobs(intake_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);

-- Enable RLS on new tables
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for intakes: block anonymous access
CREATE POLICY intakes_block_anon ON public.intakes
AS RESTRICTIVE FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Users can select their own intakes or admins can see all
CREATE POLICY intakes_select_owner_or_admin ON public.intakes
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can insert their own intakes
CREATE POLICY intakes_insert_owner ON public.intakes
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own intakes
CREATE POLICY intakes_update_owner ON public.intakes
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own intakes
CREATE POLICY intakes_delete_owner ON public.intakes
AS RESTRICTIVE FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- RLS policies for generation_jobs: block anonymous
CREATE POLICY generation_jobs_block_anon ON public.generation_jobs
AS RESTRICTIVE FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Users can view jobs for their intakes
CREATE POLICY generation_jobs_select_owner_or_admin ON public.generation_jobs
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intakes i 
    WHERE i.id = generation_jobs.intake_id 
    AND (i.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Trigger for updated_at on intakes
CREATE TRIGGER set_intakes_updated_at
BEFORE UPDATE ON public.intakes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger for updated_at on generation_jobs
CREATE TRIGGER set_generation_jobs_updated_at
BEFORE UPDATE ON public.generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();