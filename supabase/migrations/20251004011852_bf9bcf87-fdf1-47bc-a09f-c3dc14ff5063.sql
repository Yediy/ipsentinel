-- ============================================
-- CREATE SECURE RLS POLICIES
-- All policies require proper authentication (auth.uid())
-- Admin access uses has_role(auth.uid(), 'admin')
-- ============================================

-- FILINGS TABLE
CREATE POLICY "filings_select_owner_or_admin"
ON public.filings FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "filings_insert_owner"
ON public.filings FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

CREATE POLICY "filings_update_owner_or_admin"
ON public.filings FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "filings_delete_owner_or_admin"
ON public.filings FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- FILING_DOCUMENTS TABLE
CREATE POLICY "filing_documents_select_owner_or_admin"
ON public.filing_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "filing_documents_insert_owner_or_admin"
ON public.filing_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "filing_documents_update_owner_or_admin"
ON public.filing_documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "filing_documents_delete_owner_or_admin"
ON public.filing_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- DOCUMENTS TABLE
CREATE POLICY "documents_select_owner_or_admin"
ON public.documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "documents_insert_owner_or_admin"
ON public.documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "documents_update_admin_only"
ON public.documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "documents_delete_owner_or_admin"
ON public.documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = documents.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- NOTIFICATIONS TABLE
CREATE POLICY "notifications_select_owner_or_admin"
ON public.notifications FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "notifications_update_owner_or_admin"
ON public.notifications FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "notifications_insert_service_only"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- FILING_QUEUE TABLE
CREATE POLICY "filing_queue_select_owner_or_admin"
ON public.filing_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_queue.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- PATENT_SECTIONS TABLE
CREATE POLICY "patent_sections_select_owner_or_admin"
ON public.patent_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = patent_sections.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- TRADEMARK_SECTIONS TABLE
CREATE POLICY "trademark_sections_select_owner_or_admin"
ON public.trademark_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = trademark_sections.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- FILING_SECTIONS TABLE
CREATE POLICY "filing_sections_select_owner_or_admin"
ON public.filing_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = filing_sections.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- AI_FILING_SESSIONS TABLE
CREATE POLICY "ai_filing_sessions_select_owner_or_admin"
ON public.ai_filing_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = ai_filing_sessions.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- COPYRIGHTS TABLE
CREATE POLICY "copyrights_select_owner_or_admin"
ON public.copyrights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = copyrights.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- COPYRIGHT_UPLOADS TABLE
CREATE POLICY "copyright_uploads_select_owner_or_admin"
ON public.copyright_uploads FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.copyrights c
    JOIN public.filings f ON f.id = c.filing_id
    WHERE c.id = copyright_uploads.copyright_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- TRADEMARK_CLEARANCE_LOGS TABLE
CREATE POLICY "trademark_clearance_logs_select_owner_or_admin"
ON public.trademark_clearance_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = trademark_clearance_logs.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- SETTINGS TABLE
CREATE POLICY "settings_admin_only"
ON public.settings FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- AUDIT_LOG TABLE
CREATE POLICY "audit_log_select_admin_only"
ON public.audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "audit_log_deny_insert"
ON public.audit_log FOR INSERT
WITH CHECK (false);

CREATE POLICY "audit_log_deny_update"
ON public.audit_log FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "audit_log_deny_delete"
ON public.audit_log FOR DELETE
USING (false);

-- PAYMENTS TABLE
CREATE POLICY "payments_select_owner_or_admin"
ON public.payments FOR SELECT
USING (
  (auth.uid() IS NOT NULL)
  AND (
    has_role(auth.uid(), 'admin')
    OR (
      filing_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.filings f
        WHERE f.id = payments.filing_id
        AND f.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "payments_update_admin_only"
ON public.payments FOR UPDATE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "payments_delete_admin_only"
ON public.payments FOR DELETE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- UPCOMING_DEADLINES TABLE
CREATE POLICY "upcoming_deadlines_select_owner_or_admin"
ON public.upcoming_deadlines FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "upcoming_deadlines_update_admin_only"
ON public.upcoming_deadlines FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "upcoming_deadlines_delete_admin_only"
ON public.upcoming_deadlines FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- DEADLINES TABLE
CREATE POLICY "deadlines_select_owner_or_admin"
ON public.deadlines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "deadlines_update_owner_or_admin"
ON public.deadlines FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "deadlines_delete_owner_or_admin"
ON public.deadlines FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = deadlines.filing_id
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- USER_AGREEMENTS TABLE
CREATE POLICY "user_agreements_select_owner_or_admin"
ON public.user_agreements FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);