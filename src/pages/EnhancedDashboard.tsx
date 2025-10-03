import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  TrendingUp,
  Bell,
  Shield,
  Globe
} from "lucide-react";
import { Link } from 'react-router-dom';
import { AdminQuickAccessCard } from "@/components/admin/AdminQuickAccessCard";

interface Filing {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  country: string;
  payment_status?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read: boolean;
}

const EnhancedDashboard = () => {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalFilings: 0,
    pendingFilings: 0,
    approvedFilings: 0,
    drafts: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check admin status
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!adminData);

      // Load filings
      const { data: filingsData, error: filingsError } = await supabase
        .from('filings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (filingsError) throw filingsError;

      // Load notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notificationsError) throw notificationsError;

      // Calculate stats
      const totalFilings = filingsData?.length || 0;
      const pendingFilings = filingsData?.filter(f => f.status === 'pending').length || 0;
      const approvedFilings = filingsData?.filter(f => f.status === 'approved').length || 0;
      const drafts = filingsData?.filter(f => f.status === 'draft').length || 0;

      setFilings(filingsData || []);
      setNotifications(notificationsData || []);
      setStats({
        totalFilings,
        pendingFilings,
        approvedFilings,
        drafts
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">IP Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your intellectual property portfolio
          </p>
        </div>
        <Link to="/filing/wizard">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            New Filing
          </Button>
        </Link>
      </div>

      {/* Admin Quick Access - Only show for admins */}
      {isAdmin && (
        <AdminQuickAccessCard />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Filings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalFilings}</div>
            <p className="text-xs text-muted-foreground">
              All IP applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingFilings}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.approvedFilings}</div>
            <p className="text-xs text-muted-foreground">
              Successfully filed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground">
              Ready to submit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Filings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Filings
            </CardTitle>
            <CardDescription>
              Your latest intellectual property applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filings.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No filings yet</p>
                <Link to="/filing/wizard">
                  <Button>Create Your First Filing</Button>
                </Link>
              </div>
            ) : (
              filings.map((filing) => (
                <div key={filing.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(filing.status)}
                    <div className="flex-1">
                      <p className="font-medium">{filing.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {filing.type}
                        </Badge>
                        <Globe className="h-3 w-3" />
                        <span>{filing.country}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(filing.status)}>
                    {filing.status}
                  </Badge>
                </div>
              ))
            )}
            {filings.length > 0 && (
              <div className="pt-4">
                <Link to="/filings">
                  <Button variant="outline" className="w-full">
                    View All Filings
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Quick Actions
            </CardTitle>
            <CardDescription>
              Stay updated on your IP portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notifications */}
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-4">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="p-3 bg-accent/30 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-sm mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/filing/wizard?type=patent">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    File Patent
                  </Button>
                </Link>
                <Link to="/filing/wizard?type=trademark">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    File Trademark
                  </Button>
                </Link>
                <Link to="/filing/wizard?type=copyright">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    File Copyright
                  </Button>
                </Link>
                <Link to="/cost-calculator">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Zap className="h-4 w-4 mr-2" />
                    Cost Calculator
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboard;