import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PatentDraft {
  id: string;
  title: string;
  abstract: string | null;
  background: string | null;
  summary: string | null;
  detailed_description: string | null;
  claims: string | null;
  status: string;
  generated_content: {
    figure_descriptions?: string;
    generated_at?: string;
    tier?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface UsePatentRealtimeReturn {
  patent: PatentDraft | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSection: (section: string, content: string) => Promise<void>;
  saving: boolean;
}

export const usePatentRealtime = (filingId: string | undefined): UsePatentRealtimeReturn => {
  const [patent, setPatent] = useState<PatentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPatent = async () => {
    if (!filingId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filingId)
        .single();

      if (fetchError) throw fetchError;
      setPatent(data as PatentDraft);
      setError(null);
    } catch (err) {
      console.error('Error fetching patent:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patent');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (section: string, content: string) => {
    if (!filingId || !patent) return;
    
    setSaving(true);
    try {
      const updateData: Record<string, string> = {
        [section]: content,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('filings')
        .update(updateData)
        .eq('id', filingId);

      if (updateError) throw updateError;

      // Update local state
      setPatent(prev => prev ? { ...prev, [section]: content } : null);
      toast.success('Section saved');
    } catch (err) {
      console.error('Error updating section:', err);
      toast.error('Failed to save changes');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!filingId) return;

    fetchPatent();

    // Set up realtime subscription
    const channel = supabase
      .channel(`patent-${filingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'filings',
          filter: `id=eq.${filingId}`
        },
        (payload) => {
          const updated = payload.new as PatentDraft;
          setPatent(updated);
          
          // Notify user of status changes
          if (updated.status === 'ready' && patent?.status === 'generating') {
            toast.success('Your patent draft is ready!', {
              description: 'All sections have been generated.'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filingId]);

  return {
    patent,
    loading,
    error,
    refetch: fetchPatent,
    updateSection,
    saving
  };
};
