-- Consolidate duplicate RLS policies on documents, filing_documents, audit_log, webhook_events, and user_roles tables
-- This removes conflicting duplicate policies while keeping the correct consolidated ones

-- =====================================================
-- AUDIT_LOG: Remove duplicate deny policies (keep one of each operation)
-- =====================================================
DROP POLICY IF EXISTS "audit_insert_public_deny" ON public.audit_log;
DROP POLICY IF EXISTS "audit_no_delete" ON public.audit_log;
DROP POLICY IF EXISTS "audit_no_update" ON public.audit_log;
-- Keep: audit_log_deny_insert, audit_log_deny_update, audit_log_deny_delete, audit_log_select_admin_only

-- =====================================================
-- DOCUMENTS: Remove duplicate INSERT policy (keep owner_or_admin version)
-- =====================================================
DROP POLICY IF EXISTS "documents_insert_owner" ON public.documents;
-- Keep: documents_insert_owner_or_admin (allows both owner and admin to insert)
-- Keep: documents_block_anon, documents_select_owner_or_admin, documents_delete_owner_or_admin, documents_update_admin_only

-- =====================================================
-- FILING_DOCUMENTS: Remove duplicate INSERT and UPDATE policies
-- =====================================================
DROP POLICY IF EXISTS "filing_documents_insert_owner" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_documents_update_admin_only" ON public.filing_documents;
-- Keep: filing_documents_insert_owner_or_admin (allows both)
-- Keep: filing_documents_update_owner_or_admin (allows both)
-- Keep: filing_documents_block_anon, filing_documents_select_owner_or_admin, filing_documents_delete_owner_or_admin

-- =====================================================
-- USER_ROLES: Remove redundant admin policy (has_role function version is cleaner)
-- =====================================================
DROP POLICY IF EXISTS "user_roles_admin_only" ON public.user_roles;
-- Keep: "Admins can manage all roles" (uses has_role function - cleaner)
-- Keep: "Service role can manage roles" (for backend operations)
-- Keep: "Users can view their own roles" (self-service SELECT)