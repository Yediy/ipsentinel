import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  filing_id?: string;
  notification_type?: string;
}

export const useEmailSender = () => {
  const { toast } = useToast();

  const sendEmail = async (params: SendEmailParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('email-sender', {
        body: params
      });

      if (error) {
        console.error('Email sending error:', error);
        toast({
          title: "Email Error",
          description: "Failed to send email notification",
          variant: "destructive"
        });
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Email sending exception:', error);
      return { success: false, error };
    }
  };

  return { sendEmail };
};
