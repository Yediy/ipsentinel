import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { FileText, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Analytics = () => {
  const [stats, setStats] = useState({
    totalFilings: 0,
    pendingFilings: 0,
    approvedFilings: 0,
    upcomingDeadlines: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const [filingsResult, deadlinesResult] = await Promise.all([
          supabase
            .from('filings')
            .select('status', { count: 'exact' })
            .eq('user_id', session.user.id),
          supabase
            .from('upcoming_deadlines')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id)
            .eq('done', false)
        ]);

        const filings = filingsResult.data || [];
        setStats({
          totalFilings: filings.length,
          pendingFilings: filings.filter(f => f.status === 'pending').length,
          approvedFilings: filings.filter(f => f.status === 'approved').length,
          upcomingDeadlines: deadlinesResult.count || 0
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Filings"
            value={stats.totalFilings}
            description="All time"
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <KpiCard
            title="Pending"
            value={stats.pendingFilings}
            description="Awaiting review"
            icon={<Clock className="h-6 w-6" />}
          />
          <KpiCard
            title="Approved"
            value={stats.approvedFilings}
            description="Successfully filed"
            icon={<CheckCircle className="h-6 w-6" />}
          />
          <KpiCard
            title="Upcoming Deadlines"
            value={stats.upcomingDeadlines}
            description="Require attention"
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        <SectionCard
          title="Filing Overview"
          description="Visualize activity and trends"
        >
          <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
            {stats.totalFilings === 0
              ? "No data to display yet. Start a filing to see analytics."
              : "Chart visualization coming soon"}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
