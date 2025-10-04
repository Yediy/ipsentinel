-- Fix RLS policies that incorrectly reference user_id on tables without that column

-- DEADLINES: No user_id column, must join through filings
DROP POLICY IF EXISTS "deadlines_select_owner_or_admin" ON public.deadlines;
DROP POLICY IF EXISTS "deadlines_insert_owner" ON public.deadlines;
DROP POLICY IF EXISTS "deadlines_update_owner_or_admin" ON public.deadlines;
DROP POLICY IF EXISTS "deadlines_delete_owner_or_admin" ON public.deadlines;

CREATE POLICY "deadlines_select_owner_or_admin"
ON public.deadlines
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

CREATE POLICY "deadlines_insert_owner"
ON public.deadlines
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND f.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "deadlines_update_owner_or_admin"
ON public.deadlines
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

CREATE POLICY "deadlines_delete_owner_or_admin"
ON public.deadlines
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

-- PAYMENTS: No user_id column, must join through filings
DROP POLICY IF EXISTS "payments_select_owner_or_admin" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_self" ON public.payments;

CREATE POLICY "payments_select_owner_or_admin"
ON public.payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = payments.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

CREATE POLICY "payments_insert_self"
ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = payments.filing_id
    AND f.user_id = (SELECT auth.uid())
  )
);

-- AI_FILING_SESSIONS: No user_id column, must join through filings
DROP POLICY IF EXISTS "ai_filing_sessions_select_owner_or_admin" ON public.ai_filing_sessions;

CREATE POLICY "ai_filing_sessions_select_owner_or_admin"
ON public.ai_filing_sessions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = ai_filing_sessions.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

-- COPYRIGHTS: No user_id column, must join through filings
DROP POLICY IF EXISTS "copyrights_select_owner_or_admin" ON public.copyrights;

CREATE POLICY "copyrights_select_owner_or_admin"
ON public.copyrights
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = copyrights.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

-- COPYRIGHT_UPLOADS: No user_id column, must join through copyrights and filings
DROP POLICY IF EXISTS "copyright_uploads_select_owner_or_admin" ON public.copyright_uploads;

CREATE POLICY "copyright_uploads_select_owner_or_admin"
ON public.copyright_uploads
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copyrights c
    JOIN public.filings f ON f.id = c.filing_id
    WHERE c.id = copyright_uploads.copyright_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

-- TRADEMARK_CLEARANCE_LOGS: No user_id column, must join through filings
DROP POLICY IF EXISTS "trademark_clearance_logs_select_owner_or_admin" ON public.trademark_clearance_logs;

CREATE POLICY "trademark_clearance_logs_select_owner_or_admin"
ON public.trademark_clearance_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = trademark_clearance_logs.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

-- FILING_QUEUE: No user_id column, must join through filings
DROP POLICY IF EXISTS "filing_queue_select_owner_or_admin" ON public.filing_queue;
DROP POLICY IF EXISTS "queue_insert_owner" ON public.filing_queue;

CREATE POLICY "filing_queue_select_owner_or_admin"
ON public.filing_queue
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_queue.filing_id
    AND (f.user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  )
);

CREATE POLICY "queue_insert_owner"
ON public.filing_queue
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_queue.filing_id
    AND f.user_id = (SELECT auth.uid())
  )
);