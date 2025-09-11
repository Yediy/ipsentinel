-- Enable authentication profiles and enhanced functionality
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  address JSONB,
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create attorney reviews table
CREATE TABLE public.attorney_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL,
  attorney_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  suggested_changes JSONB,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attorney reviews
ALTER TABLE public.attorney_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for attorney reviews
CREATE POLICY "Users can view reviews for their filings" 
ON public.attorney_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM filings f 
    WHERE f.id = attorney_reviews.filing_id 
    AND (auth.uid() = f.user_id OR (f.user_id IS NULL AND f.contact_email IS NOT NULL))
  )
);

CREATE POLICY "Service role can manage attorney reviews" 
ON public.attorney_reviews 
FOR ALL 
USING (true);

-- Create API integration logs table
CREATE TABLE public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id UUID NOT NULL,
  api_type TEXT NOT NULL, -- 'uspto', 'usco', 'tess'
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on API logs
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for API logs
CREATE POLICY "Service role can manage API logs" 
ON public.api_logs 
FOR ALL 
USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();