import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Bell,
  BellOff,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';

interface Deadline {
  id: string;
  filing_id: string;
  label: string;
  due_on: string;
  done: boolean;
  created_at: string;
  filing?: {
    title: string;
    type: string;
    country_code: string;
  };
}

interface DeadlineTrackerProps {
  filingId?: string; // If provided, shows deadlines for specific filing
  maxItems?: number;
  showActions?: boolean;
}

export const DeadlineTracker = ({ 
  filingId, 
  maxItems = 5, 
  showActions = true 
}: DeadlineTrackerProps) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeadlines();
    setupRealtimeSubscription();
  }, [filingId]);

  const fetchDeadlines = async () => {
    try {
      let query = supabase
        .from('upcoming_deadlines')
        .select('*')
        .order('due_on', { ascending: true })
        .limit(maxItems);

      if (filingId) {
        query = query.eq('filing_id', filingId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDeadlines(data || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      toast.error('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('deadlines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadlines'
        },
        () => {
          fetchDeadlines(); // Refresh when deadlines change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markDeadlineComplete = async (deadlineId: string) => {
    try {
      const { error } = await supabase
        .from('deadlines')
        .update({ done: true })
        .eq('id', deadlineId);

      if (error) throw error;

      setDeadlines(prev =>
        prev.map(d =>
          d.id === deadlineId ? { ...d, done: true } : d
        )
      );

      toast.success('Deadline marked as complete');
    } catch (error) {
      console.error('Error updating deadline:', error);
      toast.error('Failed to update deadline');
    }
  };

  const getDeadlineUrgency = (dueDate: string, isDone: boolean) => {
    if (isDone) {
      return {
        level: 'completed' as const,
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4" />,
        progress: 100
      };
    }

    const daysUntil = differenceInDays(new Date(dueDate), new Date());
    
    if (daysUntil < 0) {
      return {
        level: 'overdue' as const,
        color: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="h-4 w-4" />,
        progress: 100
      };
    } else if (daysUntil <= 7) {
      return {
        level: 'urgent' as const,
        color: 'bg-orange-100 text-orange-800',
        icon: <Clock className="h-4 w-4" />,
        progress: 75
      };
    } else if (daysUntil <= 30) {
      return {
        level: 'upcoming' as const,
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Calendar className="h-4 w-4" />,
        progress: 50
      };
    } else {
      return {
        level: 'future' as const,
        color: 'bg-blue-100 text-blue-800',
        icon: <Calendar className="h-4 w-4" />,
        progress: 25
      };
    }
  };

  const formatDeadlineDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysUntil = differenceInDays(date, new Date());
    
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (daysUntil === -1) return '1 day overdue';
    if (daysUntil < -1) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil > 0) return `Due in ${daysUntil} days`;
    
    return format(date, 'MMM dd, yyyy');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {filingId ? 'Filing Deadlines' : 'Upcoming Deadlines'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deadlines.map((deadline) => {
              const urgency = getDeadlineUrgency(deadline.due_on, deadline.done);
              
              return (
                <div
                  key={deadline.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {deadline.label}
                        </h4>
                        <Badge className={urgency.color}>
                          <span className="flex items-center gap-1">
                            {urgency.icon}
                            {urgency.level}
                          </span>
                        </Badge>
                      </div>
                      
                      {deadline.filing && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {deadline.filing.title} • {deadline.filing.type} • {deadline.filing.country_code}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDeadlineDate(deadline.due_on)}</span>
                        <span>{format(new Date(deadline.due_on), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    {showActions && !deadline.done && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Set up reminder notification
                            toast.success('Reminder set');
                          }}
                          title="Set reminder"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markDeadlineComplete(deadline.id)}
                          title="Mark as complete"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Progress value={urgency.progress} className="h-1" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};