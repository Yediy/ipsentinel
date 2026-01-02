import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Key, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logPasswordChange } from '@/lib/audit-logger';

export function SecuritySettings() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
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
