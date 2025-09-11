-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create filings table to track IP filings
CREATE TABLE public.filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('patent', 'trademark', 'copyright')),
  country TEXT NOT NULL,
  title TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  components JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'paid', 'generating', 'ready', 'error')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'canceled', 'failed')),
  generated_content JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create filing_documents table to track generated documents
CREATE TABLE public.filing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES public.filings(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'xml', 'zip', 'json', 'docx')),
  file_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table to track Stripe payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filing_id UUID REFERENCES public.filings(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'review', 'bundle')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create filing_queue table for background job processing
CREATE TABLE public.filing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES public.filings(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'generate',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filing_id UUID REFERENCES public.filings(id) ON DELETE CASCADE,
  contact_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for filings (allow access by user_id OR contact_email for guest users)
CREATE POLICY "Users can view their own filings" ON public.filings
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND contact_email IS NOT NULL)
  );

CREATE POLICY "Anyone can insert filings" ON public.filings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update filings" ON public.filings
  FOR UPDATE USING (true);

-- Create RLS policies for filing_documents
CREATE POLICY "Users can view their filing documents" ON public.filing_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.filings f 
      WHERE f.id = filing_id AND (
        auth.uid() = f.user_id OR 
        (f.user_id IS NULL AND f.contact_email IS NOT NULL)
      )
    )
  );

CREATE POLICY "Service role can insert filing documents" ON public.filing_documents
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for payments
CREATE POLICY "Users can view their payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.filings f 
      WHERE f.id = filing_id AND (
        auth.uid() = f.user_id OR 
        (f.user_id IS NULL AND f.contact_email IS NOT NULL)
      )
    )
  );

CREATE POLICY "Service role can insert/update payments" ON public.payments
  FOR ALL USING (true);

-- Create RLS policies for filing_queue (admin/service only)
CREATE POLICY "Service role can manage filing queue" ON public.filing_queue
  FOR ALL USING (true);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND contact_email IS NOT NULL)
  );

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id OR
    (user_id IS NULL AND contact_email IS NOT NULL)
  );

CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for filing documents
INSERT INTO storage.buckets (id, name, public) VALUES ('filings', 'filings', false);

-- Create storage policies for filings bucket
CREATE POLICY "Users can view their filing documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'filings' AND 
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.filings f
        WHERE f.id::text = (storage.foldername(name))[2]
      )
    )
  );

CREATE POLICY "Service can upload filing documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'filings');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filings_updated_at
  BEFORE UPDATE ON public.filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();