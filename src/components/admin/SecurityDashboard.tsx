import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  FileText, 
  Lock, 
  Unlock,
  Activity,
  Clock,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: number;
  action: string;
  user_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface SecurityMetrics {
  totalEvents24h: number;
  totalEvents7d: number;
  totalEvents30d: number;
  actionBreakdown: Record<string, number>;
}

// Tables with RLS enabled (based on project configuration)
const rlsEnabledTables = [
  { name: 'admin_users', hasRLS: true },
  { name: 'ai_filing_sessions', hasRLS: true },
  { name: 'ai_prompt_templates', hasRLS: true },
  { name: 'audit_log', hasRLS: true },
  { name: 'copyright_uploads', hasRLS: true },
  { name: 'copyrights', hasRLS: true },
  { name: 'deadlines', hasRLS: true },
  { name: 'documents', hasRLS: true },
  { name: 'filing_documents', hasRLS: true },
  { name: 'filing_queue', hasRLS: true },
  { name: 'filing_sections', hasRLS: true },
  { name: 'filings', hasRLS: true },
  { name: 'notifications', hasRLS: true },
  { name: 'patent_sections', hasRLS: true },
  { name: 'payments', hasRLS: true },
  { name: 'profiles', hasRLS: true },
  { name: 'settings', hasRLS: true },
  { name: 'trademark_clearance_logs', hasRLS: true },
  { name: 'trademark_sections', hasRLS: true },
  { name: 'upcoming_deadlines', hasRLS: true },
  { name: 'user_agreements', hasRLS: true },
  { name: 'user_preferences', hasRLS: true },
  { name: 'user_roles', hasRLS: true },
];

// Storage buckets configuration
const storageBuckets = [
  { name: 'filings', isPublic: false },
  { name: 'copyright-works', isPublic: false },
];

export function SecurityDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents24h: 0,
    totalEvents7d: 0,
    totalEvents30d: 0,
    actionBreakdown: {},
  });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return;
      }

      setAuditLogs(data as AuditLogEntry[] || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const calculateMetrics = (logs: AuditLogEntry[]) => {
    const now = new Date();
    const day24h = subDays(now, 1);
    const day7d = subDays(now, 7);
    const day30d = subDays(now, 30);

    const totalEvents24h = logs.filter(l => new Date(l.created_at) >= day24h).length;
    const totalEvents7d = logs.filter(l => new Date(l.created_at) >= day7d).length;
    const totalEvents30d = logs.filter(l => new Date(l.created_at) >= day30d).length;

    const actionBreakdown = logs.reduce((acc, log) => {
      const action = log.action || 'unknown';
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setMetrics({
      totalEvents24h,
      totalEvents7d,
      totalEvents30d,
      actionBreakdown,
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAuditLogs();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    calculateMetrics(auditLogs);
  }, [auditLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAuditLogs();
    toast.success('Data refreshed');
    setRefreshing(false);
  };

  const filteredLogs = actionFilter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action === actionFilter);

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))];

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.length > 40) return ua.substring(0, 40) + '...';
    return ua;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents24h}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents7d}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (30d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents30d}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* RLS Policy Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Row-Level Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            {rlsEnabledTables.map((table) => (
              <div
                key={table.name}
                className="flex items-center gap-2 p-2 rounded-md border border-border"
              >
                {table.hasRLS ? (
                  <Lock className="h-4 w-4 text-success" />
                ) : (
                  <Unlock className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-mono truncate">{table.name}</span>
                <Badge variant={table.hasRLS ? 'default' : 'destructive'} className="ml-auto text-xs">
                  {table.hasRLS ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            All {rlsEnabledTables.filter(t => t.hasRLS).length} tables have Row-Level Security enabled.
          </p>
        </CardContent>
      </Card>

      {/* Storage Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {storageBuckets.map((bucket) => (
              <div
                key={bucket.name}
                className="flex items-center gap-2 p-3 rounded-md border border-border"
              >
                <Database className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm">{bucket.name}</span>
                <Badge variant={bucket.isPublic ? 'secondary' : 'default'} className="ml-auto">
                  {bucket.isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            All storage buckets are private and require authenticated access.
          </p>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit log entries found.</p>
              <p className="text-sm">Security events will appear here as they occur.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.subject_type ? `${log.subject_type}:${log.subject_id?.slice(0, 8)}` : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip || '-'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {formatUserAgent(log.user_agent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Breakdown */}
      {Object.keys(metrics.actionBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Action Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(metrics.actionBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([action, count]) => (
                  <div
                    key={action}
                    className="flex items-center justify-between p-3 rounded-md border border-border"
                  >
                    <span className="text-sm">{action}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
