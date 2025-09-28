import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FileText, 
  Clock, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardStats {
  totalFilings: number;
  totalUsers: number;
  upcomingDeadlines: number;
  recentFilings: any[];
  recentUsers: any[];
  upcomingDeadlinesList: any[];
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalFilings: 0,
    totalUsers: 0,
    upcomingDeadlines: 0,
    recentFilings: [],
    recentUsers: [],
    upcomingDeadlinesList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch filings count and recent filings
      const { data: filings, error: filingsError } = await supabase
        .from('filings')
        .select('id, title, type, country_code, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch users count and recent users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch upcoming deadlines
      const { data: deadlines, error: deadlinesError } = await supabase
        .from('upcoming_deadlines')
        .select(`
          id,
          label,
          due_on,
          filing_type,
          country_code,
          filing_id
        `)
        .order('due_on', { ascending: true })
        .limit(10);

      if (filingsError) throw filingsError;
      if (profilesError) throw profilesError;
      if (deadlinesError) throw deadlinesError;

      setStats({
        totalFilings: filings?.length || 0,
        totalUsers: profiles?.length || 0,
        upcomingDeadlines: deadlines?.length || 0,
        recentFilings: filings || [],
        recentUsers: profiles || [],
        upcomingDeadlinesList: deadlines || []
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'destructive' | 'outline' | 'secondary' } = {
      'draft': 'outline',
      'pending': 'secondary',
      'processing': 'default',
      'ready': 'default',
      'filed': 'default',
      'granted': 'default',
      'rejected': 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDeadline = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of IPGenie platform activity
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Filings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFilings}</div>
            <p className="text-xs text-muted-foreground">
              All IP filings in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Online</div>
            <p className="text-xs text-muted-foreground">
              All services operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="filings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="filings">Recent Filings</TabsTrigger>
          <TabsTrigger value="users">Recent Users</TabsTrigger>
          <TabsTrigger value="deadlines">Upcoming Deadlines</TabsTrigger>
        </TabsList>

        <TabsContent value="filings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Filings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentFilings.map((filing) => (
                    <TableRow key={filing.id}>
                      <TableCell className="font-medium">
                        {filing.title || 'Untitled'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {filing.type?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{filing.country_code}</TableCell>
                      <TableCell>{getStatusBadge(filing.status)}</TableCell>
                      <TableCell>{formatDate(filing.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No name provided'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.upcomingDeadlinesList.map((deadline) => {
                    const daysLeft = getDaysUntilDeadline(deadline.due_on);
                    return (
                      <TableRow key={deadline.id}>
                        <TableCell className="font-medium">
                          {deadline.label}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {deadline.filing_type?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{deadline.country_code}</TableCell>
                        <TableCell>{formatDate(deadline.due_on)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 30 ? 'secondary' : 'outline'}
                          >
                            {daysLeft} days
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;