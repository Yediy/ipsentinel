import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileDown, FileText, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UserAgreement {
  tos_accepted_at: string | null;
  privacy_accepted_at: string | null;
  disclaimer_accepted_at: string | null;
  version: string;
}

export function PrivacySettings() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [agreements, setAgreements] = useState<UserAgreement | null>(null);

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('user_agreements')
          .select('tos_accepted_at, privacy_accepted_at, disclaimer_accepted_at, version')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching agreements:', error);
          return;
        }

        setAgreements(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgreements();
  }, []);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('You must be logged in');
        return;
      }

      // Fetch user's data
      const [profileResult, filingsResult, preferencesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
        supabase.from('filings').select('*').eq('user_id', session.user.id),
        supabase.from('user_preferences').select('*').eq('user_id', session.user.id).maybeSingle(),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileResult.data,
        filings: filingsResult.data,
        preferences: preferencesResult.data,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ipsentinel-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (err) {
      console.error('Error exporting data:', err);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not accepted';
    return format(new Date(dateStr), 'MMMM d, yyyy');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileDown className="h-4 w-4 text-primary" />
              Export Your Data
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Download a copy of all your data stored in IPSentinel
            </p>
          </div>
          <Button variant="outline" onClick={handleExportData} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your export will include your profile information, filings, and preferences in JSON format.
        </p>
      </div>

      {/* Legal Agreements */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Legal Agreements
        </h4>

        {agreements ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Terms of Service
              </span>
              <span className="text-muted-foreground">
                {formatDate(agreements.tos_accepted_at)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Privacy Policy
              </span>
              <span className="text-muted-foreground">
                {formatDate(agreements.privacy_accepted_at)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Legal Disclaimer
              </span>
              <span className="text-muted-foreground">
                {formatDate(agreements.disclaimer_accepted_at)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Agreement version: {agreements.version}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No legal agreements found. You may need to accept them on your next login.
          </p>
        )}
      </div>

      {/* Privacy Policy Link */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Privacy Information
        </h4>
        <p className="text-sm text-muted-foreground">
          We take your privacy seriously. Your IP filing data is encrypted and stored securely.
          We never share your personal information with third parties without your consent.
        </p>
        <div className="flex gap-4">
          <a
            href="/privacy"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
