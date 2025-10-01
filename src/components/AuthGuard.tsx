import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { sanitizeError } from '@/lib/security';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Security: Clear any sensitive data from localStorage on signout
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        }

        // If no session, redirect to auth
        if (!session) {
          navigate('/auth');
          return;
        }

        // BETA REQUIREMENT: Enforce email verification
        if (session && !session.user.email_confirmed_at) {
          navigate('/please-verify');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Auth session error:', sanitizeError(error, 'auth-guard'));
        setLoading(false);
        navigate('/auth');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session) {
        navigate('/auth');
        return;
      }

      // BETA REQUIREMENT: Enforce email verification
      if (session && !session.user.email_confirmed_at) {
        navigate('/please-verify');
      }
    }).catch((error) => {
      if (!mounted) return;
      console.error('Auth session check failed:', sanitizeError(error, 'auth-guard'));
      setLoading(false);
      navigate('/auth');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
};