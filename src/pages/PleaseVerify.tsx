import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PleaseVerify() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
      } else if (user.email_confirmed_at) {
        navigate('/dashboard');
      } else {
        setEmail(user.email || '');
      }
    });
  }, [navigate]);

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent',
        description: 'Verification email has been resent. Check your inbox.',
      });
    }
    setResending(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification email to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Please check your inbox and click the verification link to continue.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={handleResend} 
              disabled={resending} 
              className="w-full"
              variant="outline"
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
