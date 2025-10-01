import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LegalConsentGateProps {
  children: React.ReactNode;
}

export const LegalConsentGate = ({ children }: LegalConsentGateProps) => {
  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!agreement || !agreement.tos_accepted_at || !agreement.privacy_accepted_at) {
        setNeedsConsent(true);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!tosAccepted || !privacyAccepted) {
      toast({
        title: 'Acceptance Required',
        description: 'You must accept both Terms of Service and Privacy Policy to continue.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_agreements')
        .upsert({
          user_id: user.id,
          tos_accepted_at: now,
          privacy_accepted_at: now,
          disclaimer_accepted_at: now,
          version: 'v1',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Thank you for accepting our terms.',
      });

      setNeedsConsent(false);
    } catch (error: any) {
      console.error('Error saving consent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save consent',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!needsConsent) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Legal Terms</CardTitle>
          <CardDescription>
            Please review and accept our terms to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="tos"
                checked={tosAccepted}
                onCheckedChange={(checked) => setTosAccepted(checked as boolean)}
              />
              <div className="space-y-1">
                <label htmlFor="tos" className="text-sm font-medium cursor-pointer">
                  I accept the Terms of Service
                </label>
                <ScrollArea className="h-32 rounded-md border p-3 text-xs text-muted-foreground">
                  <p>
                    By using IPGenie, you agree to comply with all applicable laws and regulations. 
                    This service provides tools for IP filing assistance but does not constitute legal advice. 
                    You are responsible for the accuracy of information submitted. We reserve the right to 
                    modify or terminate services at any time.
                  </p>
                </ScrollArea>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
              />
              <div className="space-y-1">
                <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                  I accept the Privacy Policy
                </label>
                <ScrollArea className="h-32 rounded-md border p-3 text-xs text-muted-foreground">
                  <p>
                    We collect and process your personal information (email, name, filing data) to provide 
                    our services. Your data is stored securely using industry-standard encryption. We do not 
                    sell your information to third parties. You have the right to access, modify, or delete 
                    your data at any time.
                  </p>
                </ScrollArea>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleAccept} 
            disabled={!tosAccepted || !privacyAccepted || submitting}
            className="w-full"
          >
            {submitting ? 'Processing...' : 'Accept and Continue'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
