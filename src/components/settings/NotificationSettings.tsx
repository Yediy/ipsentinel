import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Bell, Mail, BellRing, Clock, FileText } from 'lucide-react';

export function NotificationSettings() {
  const { preferences, loading, saving, updatePreferences } = useUserPreferences();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications" className="flex flex-col gap-1 cursor-pointer">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Email Notifications
            </span>
            <span className="font-normal text-sm text-muted-foreground">
              Receive important updates and alerts via email
            </span>
          </Label>
          <Switch
            id="email-notifications"
            checked={preferences.email_notifications}
            onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications" className="flex flex-col gap-1 cursor-pointer">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Push Notifications
            </span>
            <span className="font-normal text-sm text-muted-foreground">
              Get browser notifications for real-time updates
            </span>
          </Label>
          <Switch
            id="push-notifications"
            checked={preferences.push_notifications}
            onCheckedChange={(checked) => updatePreferences({ push_notifications: checked })}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="filing-updates" className="flex flex-col gap-1 cursor-pointer">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Filing Status Updates
            </span>
            <span className="font-normal text-sm text-muted-foreground">
              Get notified when your filing status changes
            </span>
          </Label>
          <Switch
            id="filing-updates"
            checked={preferences.filing_status_updates}
            onCheckedChange={(checked) => updatePreferences({ filing_status_updates: checked })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          Deadline Reminders
        </h4>

        <div className="flex items-center justify-between">
          <Label htmlFor="deadline-reminders" className="flex flex-col gap-1 cursor-pointer">
            <span>Enable Deadline Reminders</span>
            <span className="font-normal text-sm text-muted-foreground">
              Receive notifications about upcoming IP filing deadlines
            </span>
          </Label>
          <Switch
            id="deadline-reminders"
            checked={preferences.deadline_reminders}
            onCheckedChange={(checked) => updatePreferences({ deadline_reminders: checked })}
            disabled={saving}
          />
        </div>

        {preferences.deadline_reminders && (
          <div className="space-y-2">
            <Label htmlFor="reminder-days" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reminder Timing
            </Label>
            <Select
              value={preferences.reminder_days_before.toString()}
              onValueChange={(value) => updatePreferences({ reminder_days_before: parseInt(value) })}
              disabled={saving}
            >
              <SelectTrigger id="reminder-days" className="w-full">
                <SelectValue placeholder="Select days before deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">7 days before</SelectItem>
                <SelectItem value="14">14 days before</SelectItem>
                <SelectItem value="30">30 days before</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You'll receive a reminder {preferences.reminder_days_before} day(s) before each deadline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
