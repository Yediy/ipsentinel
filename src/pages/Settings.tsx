import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [deadlineReminders, setDeadlineReminders] = useState(true);

  return (
    <DashboardLayout>
      <SectionCard
        title="Settings"
        description="Manage your application preferences"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notifications Group */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Notifications</h4>
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="flex flex-col gap-1">
                  <span>Email Notifications</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Receive updates via email
                  </span>
                </Label>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="flex flex-col gap-1">
                  <span>Push Notifications</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Get browser notifications
                  </span>
                </Label>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="deadline-reminders" className="flex flex-col gap-1">
                  <span>Deadline Reminders</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Get notified about upcoming deadlines
                  </span>
                </Label>
                <Switch
                  id="deadline-reminders"
                  checked={deadlineReminders}
                  onCheckedChange={setDeadlineReminders}
                />
              </div>
            </div>
          </div>

          {/* Privacy & Security Group */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Privacy & Security</h4>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Manage your account security settings
              </p>
              <p className="text-xs text-muted-foreground">
                For advanced security settings (MFA, password policies), please contact support or visit your Supabase dashboard.
              </p>
            </div>

            <h4 className="text-sm font-semibold">Email Preferences</h4>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">
                You will receive important account and filing-related emails.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </DashboardLayout>
  );
};

export default Settings;
