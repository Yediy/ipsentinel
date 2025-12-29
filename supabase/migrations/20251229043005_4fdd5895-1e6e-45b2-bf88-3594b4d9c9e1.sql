-- Create user_preferences table for notification settings
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT false,
  deadline_reminders boolean NOT NULL DEFAULT true,
  reminder_days_before integer NOT NULL DEFAULT 7,
  filing_status_updates boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "user_preferences_select_self"
ON public.user_preferences
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_preferences_insert_self"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_preferences_update_self"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_preferences_delete_self"
ON public.user_preferences
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Admin can view all preferences
CREATE POLICY "user_preferences_admin_select"
ON public.user_preferences
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();