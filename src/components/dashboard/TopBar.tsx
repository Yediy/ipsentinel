import { UserCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function TopBar() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .rpc('has_role', { 
            _user_id: session.user.id, 
            _role: 'admin' 
          });
        console.info('[TopBar] Admin check result:', data);
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <header className="bg-gradient-to-br from-primary via-purple-600 to-primary text-primary-foreground shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center font-semibold">
            IP
          </div>
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-xs text-white/80">Manage your filings, notifications, and settings</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button
              variant="default"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-400 animate-pulse font-semibold"
              onClick={() => navigate('/admin')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/dashboard')}
          >
            Help
          </Button>
          <div className="flex items-center gap-2">
            <UserCircle className="h-6 w-6" />
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
