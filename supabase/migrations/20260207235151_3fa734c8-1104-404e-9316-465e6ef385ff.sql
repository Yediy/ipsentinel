
-- Add intake_id FK to documents and payments for intake-centric architecture
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS intake_id uuid REFERENCES public.intakes(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS doc_type text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_key text;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS intake_id uuid REFERENCES public.intakes(id) ON DELETE SET NULL;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_documents_intake_id ON public.documents(intake_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_payments_intake_id ON public.payments(intake_id);
