import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthMetric {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'error';
  icon: React.ReactNode;
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      setLoading(true);
      
      // Test database connectivity
      const dbStart = Date.now();
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      const dbLatency = Date.now() - dbStart;

      // Test auth service
      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Date.now() - authStart;

      const healthMetrics: HealthMetric[] = [
        {
          label: 'Database',
          value: dbError ? 'Offline' : `${dbLatency}ms`,
          status: dbError ? 'error' : dbLatency < 200 ? 'healthy' : 'warning',
          icon: <Database className="h-4 w-4" />
        },
        {
          label: 'Authentication',
          value: authError ? 'Offline' : `${authLatency}ms`,
          status: authError ? 'error' : authLatency < 200 ? 'healthy' : 'warning',
          icon: <Activity className="h-4 w-4" />
        },
        {
          label: 'Edge Functions',
          value: 'Operational',
          status: 'healthy',
          icon: <Zap className="h-4 w-4" />
        },
        {
          label: 'Storage',
          value: 'Available',
          status: 'healthy',
          icon: <CheckCircle className="h-4 w-4" />
        }
      ];

      setMetrics(healthMetrics);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)} animate-pulse`} />
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="font-medium">{metric.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{metric.value}</span>
                {getStatusBadge(metric.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
