-- =========================================
-- Security hardening migration (fixed)
-- =========================================

-- ========== A) PROFILES: block anon + remove risky column ==========
DROP POLICY IF EXISTS profiles_block_anon ON public.profiles;
CREATE POLICY profiles_block_anon
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;
CREATE POLICY profiles_select_self_or_admin
ON public.profiles
FOR SELECT
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ( user_id = (SELECT auth.uid()) );

DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin
ON public.profiles
FOR UPDATE
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) )
WITH CHECK ( user_id = (SELECT auth.uid())
             OR EXISTS ( SELECT 1 FROM public.user_roles ur
                         WHERE ur.user_id = (SELECT auth.uid())
                           AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS profiles_delete_admin_only ON public.profiles;
CREATE POLICY profiles_delete_admin_only
ON public.profiles
FOR DELETE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) );

-- ========== B) FILINGS: user_id-only policies ==========
DROP POLICY IF EXISTS filings_select_owner_or_admin ON public.filings;
CREATE POLICY filings_select_owner_or_admin
ON public.filings
FOR SELECT
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS filings_insert_owner ON public.filings;
CREATE POLICY filings_insert_owner
ON public.filings
FOR INSERT
TO authenticated
WITH CHECK ( user_id = (SELECT auth.uid()) );

DROP POLICY IF EXISTS filings_update_owner_or_admin ON public.filings;
CREATE POLICY filings_update_owner_or_admin
ON public.filings
FOR UPDATE
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) )
WITH CHECK ( user_id = (SELECT auth.uid())
             OR EXISTS ( SELECT 1 FROM public.user_roles ur
                         WHERE ur.user_id = (SELECT auth.uid())
                           AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS filings_delete_owner_or_admin ON public.filings;
CREATE POLICY filings_delete_owner_or_admin
ON public.filings
FOR DELETE
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) );

-- ========== C) DOCUMENTS: tighten policies ==========
DROP POLICY IF EXISTS documents_select_owner_or_admin ON public.documents;
CREATE POLICY documents_select_owner_or_admin
ON public.documents
FOR SELECT
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS documents_insert_owner_or_admin ON public.documents;
CREATE POLICY documents_insert_owner_or_admin
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS documents_update_admin_only ON public.documents;
CREATE POLICY documents_update_admin_only
ON public.documents
FOR UPDATE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) )
WITH CHECK ( EXISTS ( SELECT 1 FROM public.user_roles ur
                      WHERE ur.user_id = (SELECT auth.uid())
                        AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS documents_delete_owner_or_admin ON public.documents;
CREATE POLICY documents_delete_owner_or_admin
ON public.documents
FOR DELETE
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

-- ========== D) FILING_DOCUMENTS: tighten policies ==========
DROP POLICY IF EXISTS filing_documents_select_owner_or_admin ON public.filing_documents;
CREATE POLICY filing_documents_select_owner_or_admin
ON public.filing_documents
FOR SELECT
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS filing_documents_insert_owner_or_admin ON public.filing_documents;
CREATE POLICY filing_documents_insert_owner_or_admin
ON public.filing_documents
FOR INSERT
TO authenticated
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS filing_documents_update_owner_or_admin ON public.filing_documents;
CREATE POLICY filing_documents_update_owner_or_admin
ON public.filing_documents
FOR UPDATE
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
)
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS filing_documents_delete_owner_or_admin ON public.filing_documents;
CREATE POLICY filing_documents_delete_owner_or_admin
ON public.filing_documents
FOR DELETE
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

-- ========== E) USER ROLES: fix recursion ==========
DROP POLICY IF EXISTS "Direct admin check for role management" ON public.user_roles;

DROP POLICY IF EXISTS user_roles_admin_only_all ON public.user_roles;
CREATE POLICY user_roles_admin_only_all
ON public.user_roles
FOR ALL
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) )
WITH CHECK ( EXISTS ( SELECT 1 FROM public.user_roles ur
                      WHERE ur.user_id = (SELECT auth.uid())
                        AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ( user_id = (SELECT auth.uid()) );

-- ========== F) AUDIT LOG: immutable ==========
DROP POLICY IF EXISTS audit_log_select_admin_only ON public.audit_log;
CREATE POLICY audit_log_select_admin_only
ON public.audit_log
FOR SELECT
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS audit_no_update ON public.audit_log;
CREATE POLICY audit_no_update
ON public.audit_log
FOR UPDATE
TO public
USING (false);

DROP POLICY IF EXISTS audit_no_delete ON public.audit_log;
CREATE POLICY audit_no_delete
ON public.audit_log
FOR DELETE
TO public
USING (false);

DROP POLICY IF EXISTS audit_insert_public_deny ON public.audit_log;
CREATE POLICY audit_insert_public_deny
ON public.audit_log
FOR INSERT
TO public
WITH CHECK (false);

-- ========== G) PAYMENTS: tighten ==========
DROP POLICY IF EXISTS payments_select_owner_or_admin ON public.payments;
CREATE POLICY payments_select_owner_or_admin
ON public.payments
FOR SELECT
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS payments_insert_authenticated_users_only ON public.payments;
CREATE POLICY payments_insert_authenticated_users_only
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS payments_update_admin_only ON public.payments;
CREATE POLICY payments_update_admin_only
ON public.payments
FOR UPDATE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) )
WITH CHECK ( EXISTS ( SELECT 1 FROM public.user_roles ur
                      WHERE ur.user_id = (SELECT auth.uid())
                        AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS payments_delete_admin_only ON public.payments;
CREATE POLICY payments_delete_admin_only
ON public.payments
FOR DELETE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) );

-- ========== H) NOTIFICATIONS: tighten ==========
DROP POLICY IF EXISTS notifications_select_owner_or_admin ON public.notifications;
CREATE POLICY notifications_select_owner_or_admin
ON public.notifications
FOR SELECT
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS notifications_update_owner_or_admin ON public.notifications;
CREATE POLICY notifications_update_owner_or_admin
ON public.notifications
FOR UPDATE
TO authenticated
USING ( user_id = (SELECT auth.uid())
        OR EXISTS ( SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = (SELECT auth.uid())
                      AND ur.role = 'admin'::app_role ) )
WITH CHECK ( user_id = (SELECT auth.uid())
             OR EXISTS ( SELECT 1 FROM public.user_roles ur
                         WHERE ur.user_id = (SELECT auth.uid())
                           AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS notifications_insert_service_only ON public.notifications;
CREATE POLICY notifications_insert_service_only
ON public.notifications
FOR INSERT
TO public
WITH CHECK (false);

-- ========== I) DEADLINES: tighten ==========
DROP POLICY IF EXISTS deadlines_select_owner_or_admin ON public.deadlines;
CREATE POLICY deadlines_select_owner_or_admin
ON public.deadlines
FOR SELECT
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS deadlines_insert_owner ON public.deadlines;
CREATE POLICY deadlines_insert_owner
ON public.deadlines
FOR INSERT
TO authenticated
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS deadlines_update_owner_or_admin ON public.deadlines;
CREATE POLICY deadlines_update_owner_or_admin
ON public.deadlines
FOR UPDATE
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
)
WITH CHECK (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS deadlines_delete_owner_or_admin ON public.deadlines;
CREATE POLICY deadlines_delete_owner_or_admin
ON public.deadlines
FOR DELETE
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

-- ========== J) UPCOMING_DEADLINES: tighten ==========
DROP POLICY IF EXISTS upcoming_deadlines_select_owner_or_admin ON public.upcoming_deadlines;
CREATE POLICY upcoming_deadlines_select_owner_or_admin
ON public.upcoming_deadlines
FOR SELECT
TO authenticated
USING (
  filing_id IN (
    SELECT id FROM public.filings
    WHERE user_id = (SELECT auth.uid())
       OR EXISTS ( SELECT 1 FROM public.user_roles ur
                   WHERE ur.user_id = (SELECT auth.uid())
                     AND ur.role = 'admin'::app_role )
  )
);

DROP POLICY IF EXISTS upcoming_deadlines_update_admin_only ON public.upcoming_deadlines;
CREATE POLICY upcoming_deadlines_update_admin_only
ON public.upcoming_deadlines
FOR UPDATE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) )
WITH CHECK ( EXISTS ( SELECT 1 FROM public.user_roles ur
                      WHERE ur.user_id = (SELECT auth.uid())
                        AND ur.role = 'admin'::app_role ) );

DROP POLICY IF EXISTS upcoming_deadlines_delete_admin_only ON public.upcoming_deadlines;
CREATE POLICY upcoming_deadlines_delete_admin_only
ON public.upcoming_deadlines
FOR DELETE
TO authenticated
USING ( EXISTS ( SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = (SELECT auth.uid())
                   AND ur.role = 'admin'::app_role ) );

-- ========== K) Remove duplicate indexes ==========
DROP INDEX IF EXISTS documents_filing_idx;
DROP INDEX IF EXISTS idx_filings_user;
DROP INDEX IF EXISTS filings_user_idx;

-- ========== L) Ensure admin user (using proper composite key) ==========
INSERT INTO public.user_roles (user_id, role)
VALUES ('6229d4c5-514c-4321-a697-950aea7123d0', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (user_id, email, full_name)
VALUES ('6229d4c5-514c-4321-a697-950aea7123d0', 'brandgantt@gmail.com', 'Admin')
ON CONFLICT (user_id) DO NOTHING;