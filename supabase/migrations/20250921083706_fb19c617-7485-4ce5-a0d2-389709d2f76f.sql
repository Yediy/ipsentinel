-- Fix upcoming_deadlines - convert from view to table with proper RLS
-- Drop the view if it exists
DROP VIEW IF EXISTS public.upcoming_deadlines CASCADE;

-- Create the table (this should now work since we dropped the view)
CREATE TABLE IF NOT EXISTS public.upcoming_deadlines (
  id uuid primary key default gen_random_uuid(),
  filing_id uuid not null references public.filings(id) on delete cascade,
  label text not null,
  due_on date not null,
  done boolean not null default false,
  user_id uuid not null,
  country_code text,
  route text,
  filing_type text,
  refreshed_at timestamptz not null default now()
);

-- Enable RLS
ALTER TABLE public.upcoming_deadlines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "upcoming_select_owner_or_admin" ON public.upcoming_deadlines
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "upcoming_insert_admin_only" ON public.upcoming_deadlines
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "upcoming_update_admin_only" ON public.upcoming_deadlines
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "upcoming_delete_admin_only" ON public.upcoming_deadlines
  FOR DELETE USING (public.is_admin());

-- Initial populate from deadlines
INSERT INTO public.upcoming_deadlines (id, filing_id, label, due_on, done, user_id, country_code, route, filing_type, refreshed_at)
SELECT 
  gen_random_uuid(), 
  f.id, 
  d.label, 
  d.due_on, 
  d.done, 
  f.user_id, 
  f.country_code, 
  f.route, 
  f.type, 
  now()
FROM public.deadlines d
JOIN public.filings f ON f.id = d.filing_id
WHERE d.done = false AND d.due_on >= current_date
ON CONFLICT DO NOTHING;