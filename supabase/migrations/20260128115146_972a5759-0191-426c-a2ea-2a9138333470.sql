-- Add write protection policies for tables that should only be modified via backend/service role

-- ai_filing_sessions: block client-side writes
DROP POLICY IF EXISTS "ai_filing_sessions_deny_insert" ON public.ai_filing_sessions;
CREATE POLICY "ai_filing_sessions_deny_insert" ON public.ai_filing_sessions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "ai_filing_sessions_deny_update" ON public.ai_filing_sessions;
CREATE POLICY "ai_filing_sessions_deny_update" ON public.ai_filing_sessions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "ai_filing_sessions_deny_delete" ON public.ai_filing_sessions;
CREATE POLICY "ai_filing_sessions_deny_delete" ON public.ai_filing_sessions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- filing_sections: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "filing_sections_deny_insert" ON public.filing_sections;
CREATE POLICY "filing_sections_deny_insert" ON public.filing_sections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "filing_sections_deny_update" ON public.filing_sections;
CREATE POLICY "filing_sections_deny_update" ON public.filing_sections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "filing_sections_deny_delete" ON public.filing_sections;
CREATE POLICY "filing_sections_deny_delete" ON public.filing_sections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- patent_sections: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "patent_sections_deny_insert" ON public.patent_sections;
CREATE POLICY "patent_sections_deny_insert" ON public.patent_sections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "patent_sections_deny_update" ON public.patent_sections;
CREATE POLICY "patent_sections_deny_update" ON public.patent_sections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "patent_sections_deny_delete" ON public.patent_sections;
CREATE POLICY "patent_sections_deny_delete" ON public.patent_sections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- trademark_sections: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "trademark_sections_deny_insert" ON public.trademark_sections;
CREATE POLICY "trademark_sections_deny_insert" ON public.trademark_sections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "trademark_sections_deny_update" ON public.trademark_sections;
CREATE POLICY "trademark_sections_deny_update" ON public.trademark_sections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "trademark_sections_deny_delete" ON public.trademark_sections;
CREATE POLICY "trademark_sections_deny_delete" ON public.trademark_sections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- copyrights: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "copyrights_deny_insert" ON public.copyrights;
CREATE POLICY "copyrights_deny_insert" ON public.copyrights
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "copyrights_deny_update" ON public.copyrights;
CREATE POLICY "copyrights_deny_update" ON public.copyrights
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "copyrights_deny_delete" ON public.copyrights;
CREATE POLICY "copyrights_deny_delete" ON public.copyrights
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- copyright_uploads: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "copyright_uploads_deny_insert" ON public.copyright_uploads;
CREATE POLICY "copyright_uploads_deny_insert" ON public.copyright_uploads
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "copyright_uploads_deny_update" ON public.copyright_uploads;
CREATE POLICY "copyright_uploads_deny_update" ON public.copyright_uploads
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "copyright_uploads_deny_delete" ON public.copyright_uploads;
CREATE POLICY "copyright_uploads_deny_delete" ON public.copyright_uploads
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- trademark_clearance_logs: block client-side writes (already has select policy)
DROP POLICY IF EXISTS "trademark_clearance_logs_deny_insert" ON public.trademark_clearance_logs;
CREATE POLICY "trademark_clearance_logs_deny_insert" ON public.trademark_clearance_logs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "trademark_clearance_logs_deny_update" ON public.trademark_clearance_logs;
CREATE POLICY "trademark_clearance_logs_deny_update" ON public.trademark_clearance_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "trademark_clearance_logs_deny_delete" ON public.trademark_clearance_logs;
CREATE POLICY "trademark_clearance_logs_deny_delete" ON public.trademark_clearance_logs
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);