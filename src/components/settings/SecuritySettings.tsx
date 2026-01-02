import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Key, AlertTriangle, CheckCircle, ExternalLink, Monitor, Smartphone, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logPasswordChange } from '@/lib/audit-logger';
import { format } from 'date-fns';

interface Session {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  updated_at: string;
  is_current: boolean;
}

export function SecuritySettings() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setSessions([]);
        return;
      }

      // Get current session info - Supabase doesn't expose all sessions directly,
      // so we show the current session and any we've logged in audit_log
      const { data: auditData } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(10);

      // Create session entries from audit logs + current session
      const sessionList: Session[] = [];
      
      // Current session is always first
      sessionList.push({
        id: 'current',
        user_agent: navigator.userAgent,
        ip: null,
        created_at: currentSession.user.last_sign_in_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_current: true
      });

      // Add recent login sessions from audit log (for display purposes)
      if (auditData) {
        for (const log of auditData.slice(0, 5)) {
          // Skip if it looks like the current session
          if (log.user_agent === navigator.userAgent) continue;
          
          sessionList.push({
            id: String(log.id),
            user_agent: log.user_agent,
            ip: log.ip,
            created_at: log.created_at || new Date().toISOString(),
            updated_at: log.created_at || new Date().toISOString(),
            is_current: false
          });
        }
      }

      setSessions(sessionList);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const revokeAllOtherSessions = async () => {
    setRevokingSession('all');
    try {
      // Sign out from all devices except current
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('All other sessions have been revoked');
      await fetchSessions();
    } catch (err) {
      console.error('Error revoking sessions:', err);
      toast.error('Failed to revoke sessions');
    } finally {
      setRevokingSession(null);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password updated successfully');
      
      // Log password change for security audit
      logPasswordChange().catch(console.error);
      
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const parseUserAgent = (ua: string | null): { device: string; browser: string } => {
    if (!ua) return { device: 'Unknown Device', browser: 'Unknown Browser' };
    
    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet/i.test(ua)) device = 'Tablet';
    
    let browser = 'Unknown';
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    
    return { device, browser };
  };

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Active Sessions
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Manage devices where you're logged in
            </p>
          </div>
          {sessions.filter(s => !s.is_current).length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={revokeAllOtherSessions}
              disabled={revokingSession === 'all'}
            >
              {revokingSession === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Revoke All Others
            </Button>
          )}
        </div>

        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active sessions found
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const { device, browser } = parseUserAgent(session.user_agent);
              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    session.is_current ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {device === 'Mobile' ? (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{browser} on {device}</span>
                        {session.is_current && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.ip && <span>{session.ip} • </span>}
                        Last active: {format(new Date(session.updated_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Password
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Change your account password
            </p>
          </div>
          {!changingPassword && (
            <Button variant="outline" onClick={() => setChangingPassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        {changingPassword && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePasswordChange} disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChangingPassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Two-Factor Authentication
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Two-factor authentication is managed through your Supabase authentication settings. 
            Contact your administrator to enable MFA for enhanced security.
          </AlertDescription>
        </Alert>
      </div>

      {/* Security Tips */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          Security Best Practices
        </h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
            Use a strong, unique password with at least 12 characters
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
            Enable two-factor authentication when available
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
            Never share your login credentials with others
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
            Log out from shared or public devices
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
            Review your account activity regularly
          </li>
        </ul>
      </div>

      {/* External Resources */}
      <div className="rounded-lg border border-border p-4">
        <a
          href="https://supabase.com/docs/guides/auth/multi-factor-authentication"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Learn more about Supabase MFA setup
        </a>
      </div>
    </div>
  );
}
