import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logFilingView } from '@/lib/audit-logger';

interface Filing {
  id: string;
  type: string;
  title: string;
  status: string;
  country_code: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  route?: string;
  priority_date?: string;
  user_id: string;
  documents?: {
    id: string;
    kind: string;
    url: string;
    created_at: string;
  }[];
}

interface UseFilingStatusReturn {
  filings: Filing[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateFilingStatus: (id: string, status: string) => Promise<void>;
}

export const useFilingStatus = (): UseFilingStatusReturn => {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFilings();
    setupRealtimeSubscription();
  }, []);

  const fetchFilings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('filings')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFilings(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filings';
      setError(errorMessage);
      console.error('Error fetching filings:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('filings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'filings'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFiling = payload.new as Filing;
            setFilings(prev => [newFiling, ...prev]);
            toast.success('New filing created');
          } else if (payload.eventType === 'UPDATE') {
            const updatedFiling = payload.new as Filing;
            setFilings(prev =>
              prev.map(filing =>
                filing.id === updatedFiling.id ? updatedFiling : filing
              )
            );
            toast.info('Filing status updated');
          } else if (payload.eventType === 'DELETE') {
            const deletedFiling = payload.old as Filing;
            setFilings(prev =>
              prev.filter(filing => filing.id !== deletedFiling.id)
            );
            toast.info('Filing deleted');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateFilingStatus = async (id: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from('filings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setFilings(prev =>
        prev.map(filing =>
          filing.id === id
            ? { ...filing, status, updated_at: new Date().toISOString() }
            : filing
        )
      );

      toast.success('Filing status updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update filing status';
      console.error('Error updating filing status:', err);
      toast.error(errorMessage);
      throw err;
    }
  };

  const refetch = async () => {
    await fetchFilings();
  };

  return {
    filings,
    loading,
    error,
    refetch,
    updateFilingStatus
  };
};

// Hook for managing individual filing details
export const useFilingDetails = (filingId: string | null) => {
  const [filing, setFiling] = useState<Filing | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filingId) {
      fetchFilingDetails();
    }
  }, [filingId]);

  const fetchFilingDetails = async () => {
    if (!filingId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch filing details
      const { data: filingData, error: filingError } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filingId)
        .single();

      if (filingError) throw filingError;

      // Fetch documents using the documents table
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('filing_id', filingId);

      if (documentsError) throw documentsError;

      // Fetch related deadlines
      const { data: deadlinesData, error: deadlinesError } = await supabase
        .from('deadlines')
        .select('*')
        .eq('filing_id', filingId)
        .order('due_on', { ascending: true });

      if (deadlinesError) throw deadlinesError;

      setFiling(filingData);
      setDocuments(documents || []);
      setDeadlines(deadlinesData || []);
      
      // Log filing view for security audit
      logFilingView(filingId, filingData?.title).catch(console.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch filing details';
      setError(errorMessage);
      console.error('Error fetching filing details:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    filing,
    documents,
    deadlines,
    loading,
    error,
    refetch: fetchFilingDetails
  };
};