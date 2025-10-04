import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  FileText, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Plus
} from "lucide-react";
import { DeadlineManager } from "@/components/deadlines/DeadlineManager";
import { Link } from "react-router-dom";

interface Filing {
  id: string;
  title: string;
  type: string;
  country: string;
  status: string;
  route?: string;
  created_at: string;
  priority_date?: string;
  pct_national_deadline?: string;
  paris_deadline?: string;
}

interface Deadline {
  id: string;
  filing_id: string;
  label: string;
  due_on: string;
  done: boolean;
}

export const InternationalDashboard: React.FC = () => {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load recent filings
      const { data: filingsData, error: filingsError } = await supabase
        .from('filings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (filingsError) throw filingsError;

      // Load upcoming deadlines
      const { data: deadlinesData, error: deadlinesError } = await supabase
        .from('deadlines')
        .select('*')
        .eq('done', false)
        .gte('due_on', new Date().toISOString().split('T')[0])
        .order('due_on', { ascending: true })
        .limit(5);

      if (deadlinesError) throw deadlinesError;

      setFilings(filingsData || []);
      setDeadlines(deadlinesData || []);

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
    switch (status.toLowerCase()) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'filed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'ready': return 'bg-primary/10 text-primary';
      case 'submitted': return 'bg-warning/10 text-warning';
      case 'filed': return 'bg-success/10 text-success';
      default: return 'bg-destructive/10 text-destructive';
    }
  };

  const stats = {
    totalFilings: filings.length,
    draftFilings: filings.filter(f => f.status === 'draft').length,
    activeFilings: filings.filter(f => ['ready', 'submitted', 'filed'].includes(f.status)).length,
    upcomingDeadlines: deadlines.length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-background border-border">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            International IP Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your global intellectual property portfolio
          </p>
        </div>
        
        <Link to="/international-filing">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New International Filing
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-background border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 rounded-full p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Filings</p>
                <p className="text-2xl font-bold">{stats.totalFilings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-warning/10 rounded-full p-3">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">{stats.draftFilings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-success/10 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.activeFilings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-destructive/10 rounded-full p-3">
                <Calendar className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
                <p className="text-2xl font-bold">{stats.upcomingDeadlines}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Filings */}
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Filings
            </CardTitle>
            <CardDescription>
              Your latest international IP applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filings.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No filings yet</p>
                <Link to="/international-filing">
                  <Button variant="outline">Start Your First Filing</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filings.slice(0, 5).map((filing) => (
                  <div key={filing.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(filing.status)}
                      <div>
                        <h3 className="font-medium">{filing.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {filing.type.toUpperCase()} • {filing.country} 
                          {filing.route && ` • ${filing.route.toUpperCase()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(filing.status)}>
                        {filing.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadline Manager */}
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Deadline Manager
            </CardTitle>
            <CardDescription>
              Critical deadlines for your international filings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeadlineManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};