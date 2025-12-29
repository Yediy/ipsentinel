import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  deadline_reminders: boolean;
  reminder_days_before: number;
  filing_status_updates: boolean;
}

const defaultPreferences: UserPreferences = {
  email_notifications: true,
  push_notifications: false,
  deadline_reminders: true,
  reminder_days_before: 7,
  filing_status_updates: true,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          deadline_reminders: data.deadline_reminders,
          reminder_days_before: data.reminder_days_before,
          filing_status_updates: data.filing_status_updates,
        });
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('You must be logged in to update preferences');
        return false;
      }

      const newPreferences = { ...preferences, ...updates };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          ...newPreferences,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error updating preferences:', error);
        toast.error('Failed to update preferences');
        return false;
      }

      setPreferences(newPreferences);
      toast.success('Preferences updated');
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      toast.error('Failed to update preferences');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
