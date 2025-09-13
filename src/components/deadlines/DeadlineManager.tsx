import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Deadline {
  id: string;
  filing_id: string;
  label: string;
  due_on: string;
  done: boolean;
  created_at: string;
}

interface DeadlineManagerProps {
  filing_id?: string;
  showFilingInfo?: boolean;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ 
  filing_id, 
  showFilingInfo = false 
}) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeadline, setNewDeadline] = useState({ label: '', due_on: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadDeadlines();
  }, [filing_id]);

  const loadDeadlines = async () => {
    try {
      let query = supabase.from('deadlines').select('*');
      
      if (filing_id) {
        query = query.eq('filing_id', filing_id);
      }
      
      const { data, error } = await query.order('due_on', { ascending: true });
      
      if (error) throw error;
      setDeadlines(data || []);
    } catch (error: any) {
      console.error('Failed to load deadlines:', error);
      toast.error("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  };

  const addDeadline = async () => {
    if (!newDeadline.label || !newDeadline.due_on) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!filing_id) {
      toast.error("Filing ID is required to add deadlines");
      return;
    }

    try {
      const { error } = await supabase
        .from('deadlines')
        .insert({
          filing_id,
          label: newDeadline.label,
          due_on: newDeadline.due_on
        });

      if (error) throw error;

      toast.success("Deadline added successfully");
      setNewDeadline({ label: '', due_on: '' });
      setShowAddDialog(false);
      await loadDeadlines();
    } catch (error: any) {
      console.error('Failed to add deadline:', error);
      toast.error("Failed to add deadline");
    }
  };

  const toggleDeadline = async (id: string, done: boolean) => {
    try {
      const { error } = await supabase
        .from('deadlines')
        .update({ done })
        .eq('id', id);

      if (error) throw error;

      toast.success(done ? "Deadline marked as complete" : "Deadline marked as pending");
      await loadDeadlines();
    } catch (error: any) {
      console.error('Failed to update deadline:', error);
      toast.error("Failed to update deadline");
    }
  };

  const deleteDeadline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deadlines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Deadline deleted");
      await loadDeadlines();
    } catch (error: any) {
      console.error('Failed to delete deadline:', error);
      toast.error("Failed to delete deadline");
    }
  };

  const recalculateDeadlines = async () => {
    if (!filing_id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('deadline-calculator', {
        body: { filing_id }
      });

      if (error) throw error;

      toast.success("Deadlines recalculated");
      await loadDeadlines();
    } catch (error: any) {
      console.error('Failed to recalculate deadlines:', error);
      toast.error("Failed to recalculate deadlines");
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (dueDate: string, done: boolean) => {
    if (done) return { variant: 'default', text: 'Complete', icon: CheckCircle };
    
    const days = getDaysUntilDue(dueDate);
    
    if (days < 0) return { variant: 'destructive', text: 'Overdue', icon: AlertTriangle };
    if (days <= 30) return { variant: 'secondary', text: `${days} days left`, icon: Clock };
    return { variant: 'outline', text: `${days} days left`, icon: Calendar };
  };

  const upcomingDeadlines = deadlines.filter(d => !d.done && getDaysUntilDue(d.due_on) <= 60);
  const overdueDeadlines = deadlines.filter(d => !d.done && getDaysUntilDue(d.due_on) < 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="animate-spin h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {!filing_id && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <div className="text-2xl font-bold">{overdueDeadlines.length}</div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div>
                  <div className="text-2xl font-bold">{upcomingDeadlines.length}</div>
                  <div className="text-sm text-muted-foreground">Upcoming (60 days)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{deadlines.filter(d => d.done).length}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deadlines List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {filing_id ? 'Filing Deadlines' : 'All Deadlines'}
            </CardTitle>
            <div className="flex gap-2">
              {filing_id && (
                <>
                  <Button onClick={recalculateDeadlines} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Deadline
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Deadline</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Label</label>
                          <Input
                            value={newDeadline.label}
                            onChange={(e) => setNewDeadline(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="e.g., PCT National Phase Deadline"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Due Date</label>
                          <Input
                            type="date"
                            value={newDeadline.due_on}
                            onChange={(e) => setNewDeadline(prev => ({ ...prev, due_on: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={addDeadline} className="flex-1">
                            Add Deadline
                          </Button>
                          <Button onClick={() => setShowAddDialog(false)} variant="outline">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deadlines found</p>
              {filing_id && (
                <p className="text-sm mt-2">Add deadlines to track important dates for this filing</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.map((deadline) => {
                const status = getDeadlineStatus(deadline.due_on, deadline.done);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={deadline.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      deadline.done ? 'bg-muted/50' : 'bg-background'
                    }`}
                  >
                    <Checkbox
                      checked={deadline.done}
                      onCheckedChange={(checked) => toggleDeadline(deadline.id, !!checked)}
                    />
                    
                    <StatusIcon className={`h-5 w-5 ${
                      status.variant === 'destructive' ? 'text-destructive' :
                      status.variant === 'secondary' ? 'text-warning' :
                      status.variant === 'default' ? 'text-primary' :
                      'text-muted-foreground'
                    }`} />

                    <div className="flex-1">
                      <div className={`font-medium ${deadline.done ? 'line-through text-muted-foreground' : ''}`}>
                        {deadline.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due: {new Date(deadline.due_on).toLocaleDateString()}
                      </div>
                    </div>

                    <Badge variant={status.variant as any}>
                      {status.text}
                    </Badge>

                    {filing_id && (
                      <Button
                        onClick={() => deleteDeadline(deadline.id)}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};