import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
  epo_enabled: boolean;
  pct_enabled: boolean;
  cnipa_enabled: boolean;
  madrid_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  epo_enabled: false,
  pct_enabled: false,
  cnipa_enabled: false,
  madrid_enabled: false,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'feature_flags')
          .single();

        if (error) {
          // If not found or no access, use defaults
          if (error.code === 'PGRST116') {
            setFlags(DEFAULT_FLAGS);
          } else {
            throw error;
          }
        } else if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
          const parsedFlags = data.value as Record<string, unknown>;
          setFlags({
            epo_enabled: Boolean(parsedFlags.epo_enabled ?? false),
            pct_enabled: Boolean(parsedFlags.pct_enabled ?? false),
            cnipa_enabled: Boolean(parsedFlags.cnipa_enabled ?? false),
            madrid_enabled: Boolean(parsedFlags.madrid_enabled ?? false),
          });
        }
      } catch (err: any) {
        console.error('Error fetching feature flags:', err);
        setError(err.message);
        setFlags(DEFAULT_FLAGS);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, []);

  const isEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag] ?? false;
  };

  return {
    flags,
    loading,
    error,
    isEnabled,
    isEpoEnabled: flags.epo_enabled,
    isPctEnabled: flags.pct_enabled,
    isCnipaEnabled: flags.cnipa_enabled,
    isMadridEnabled: flags.madrid_enabled,
  };
}
