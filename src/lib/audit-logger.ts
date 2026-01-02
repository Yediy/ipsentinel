import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | 'login'
  | 'logout'
  | 'signup'
  | 'password_change'
  | 'password_reset_request'
  | 'filing_view'
  | 'filing_create'
  | 'filing_update'
  | 'filing_delete'
  | 'profile_update'
  | 'preferences_update'
  | 'session_refresh';

interface AuditLogEntry {
  action: AuditAction;
  subjectType?: 'filing' | 'profile' | 'user' | 'preferences';
  subjectId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs security-relevant actions to the audit_log table via edge function
 * This is done server-side to ensure proper security context
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session available for audit logging');
      return;
    }

    // Collect client-side context
    const userAgent = navigator.userAgent;

    // Call audit-log edge function
    const { error } = await supabase.functions.invoke('audit-log', {
      body: {
        action: entry.action,
        subject_type: entry.subjectType,
        subject_id: entry.subjectId,
        metadata: entry.metadata,
        user_agent: userAgent,
      }
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}

/**
 * Log a login event
 */
export function logLogin(): Promise<void> {
  return logAuditEvent({
    action: 'login',
    subjectType: 'user',
    metadata: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log a signup event
 */
export function logSignup(): Promise<void> {
  return logAuditEvent({
    action: 'signup',
    subjectType: 'user',
    metadata: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log a password change event
 */
export function logPasswordChange(): Promise<void> {
  return logAuditEvent({
    action: 'password_change',
    subjectType: 'user',
    metadata: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log a filing view event
 */
export function logFilingView(filingId: string, filingTitle?: string): Promise<void> {
  return logAuditEvent({
    action: 'filing_view',
    subjectType: 'filing',
    subjectId: filingId,
    metadata: { title: filingTitle, timestamp: new Date().toISOString() }
  });
}

/**
 * Log a filing create event
 */
export function logFilingCreate(filingId: string, filingType?: string): Promise<void> {
  return logAuditEvent({
    action: 'filing_create',
    subjectType: 'filing',
    subjectId: filingId,
    metadata: { type: filingType, timestamp: new Date().toISOString() }
  });
}

/**
 * Log a profile update event
 */
export function logProfileUpdate(): Promise<void> {
  return logAuditEvent({
    action: 'profile_update',
    subjectType: 'profile',
    metadata: { timestamp: new Date().toISOString() }
  });
}

/**
 * Log a preferences update event
 */
export function logPreferencesUpdate(): Promise<void> {
  return logAuditEvent({
    action: 'preferences_update',
    subjectType: 'preferences',
    metadata: { timestamp: new Date().toISOString() }
  });
}
