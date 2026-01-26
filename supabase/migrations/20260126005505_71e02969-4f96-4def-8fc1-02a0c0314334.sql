-- 1) Block anonymous access explicitly
DROP POLICY IF EXISTS profiles_block_anon ON public.profiles;

CREATE POLICY profiles_block_anon
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2) Drop dangerous column if still present
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Migrate any stragglers from contact_email → user_id (best-effort)
UPDATE public.filings f
SET user_id = p.user_id
FROM public.profiles p
WHERE f.user_id IS NULL
  AND f.contact_email IS NOT NULL
  AND lower(p.email) = lower(f.contact_email);

-- Remove legacy columns
ALTER TABLE public.filings       DROP COLUMN IF EXISTS contact_email;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS contact_email;

-- Ensure filings RLS has no auth.email() checks
DROP POLICY IF EXISTS filings_select_owner_or_admin ON public.filings;
CREATE POLICY filings_select_owner_or_admin
ON public.filings
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
));

-- Remove problematic policy
DROP POLICY IF EXISTS "Direct admin check for role management" ON public.user_roles;

-- Only admins may SELECT/modify roles; rely on security definer has_role()
DROP POLICY IF EXISTS user_roles_admin_only ON public.user_roles;
CREATE POLICY user_roles_admin_only
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
);

-- Allow users to view their own roles (SELECT only)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can read audit log
DROP POLICY IF EXISTS audit_log_select_admin_only ON public.audit_log;
CREATE POLICY audit_log_select_admin_only
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
);

-- Deny update/delete to everyone (including service) via RLS
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

-- Inserts: allow only service role (bypasses RLS in practice). For safety, we keep a policy that denies public inserts:
DROP POLICY IF EXISTS audit_insert_public_deny ON public.audit_log;
CREATE POLICY audit_insert_public_deny
ON public.audit_log
FOR INSERT
TO public
WITH CHECK (false);

-- Filings UPDATE policy
DROP POLICY IF EXISTS filings_update_owner_or_admin ON public.filings;
CREATE POLICY filings_update_owner_or_admin
ON public.filings
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::app_role)
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::app_role)
);

-- Documents: drop duplicate indexes; keep one
DROP INDEX IF EXISTS documents_filing_idx;

-- Filings: drop redundant ones
DROP INDEX IF EXISTS idx_filings_user;