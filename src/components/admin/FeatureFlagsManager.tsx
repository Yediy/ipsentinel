import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag, Globe, Loader2, Save, RefreshCw, AlertTriangle } from "lucide-react";

interface FeatureFlags {
  epo_enabled: boolean;
  pct_enabled: boolean;
  cnipa_enabled: boolean;
  madrid_enabled: boolean;
}

interface FlagConfig {
  key: keyof FeatureFlags;
  label: string;
  description: string;
  region: string;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    key: 'epo_enabled',
    label: 'European Patent Office (EPO)',
    description: 'Enable European Patent Convention filings and EP designations',
    region: 'Europe'
  },
  {
    key: 'pct_enabled',
    label: 'Patent Cooperation Treaty (PCT)',
    description: 'Enable PCT international patent applications',
    region: 'International'
  },
  {
    key: 'cnipa_enabled',
    label: 'China National IP Administration (CNIPA)',
    description: 'Enable Chinese patent and trademark filings',
    region: 'China'
  },
  {
    key: 'madrid_enabled',
    label: 'Madrid Protocol',
    description: 'Enable international trademark registrations via Madrid System',
    region: 'International'
  }
];

export function FeatureFlagsManager() {
  const [flags, setFlags] = useState<FeatureFlags>({
    epo_enabled: false,
    pct_enabled: false,
    cnipa_enabled: false,
    madrid_enabled: false
  });
  const [originalFlags, setOriginalFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'feature_flags')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const parsedFlags = data.value as Record<string, unknown>;
        const loadedFlags: FeatureFlags = {
          epo_enabled: Boolean(parsedFlags.epo_enabled ?? false),
          pct_enabled: Boolean(parsedFlags.pct_enabled ?? false),
          cnipa_enabled: Boolean(parsedFlags.cnipa_enabled ?? false),
          madrid_enabled: Boolean(parsedFlags.madrid_enabled ?? false)
        };
        setFlags(loadedFlags);
        setOriginalFlags(loadedFlags);
      } else {
        // No existing flags, use defaults
        setOriginalFlags(flags);
      }
    } catch (err: any) {
      console.error('Error fetching feature flags:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof FeatureFlags) => {
    setFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const hasChanges = originalFlags && JSON.stringify(flags) !== JSON.stringify(originalFlags);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Cast flags to Json-compatible format
      const flagsValue = {
        epo_enabled: flags.epo_enabled,
        pct_enabled: flags.pct_enabled,
        cnipa_enabled: flags.cnipa_enabled,
        madrid_enabled: flags.madrid_enabled
      };

      // First try to update, if no rows affected, insert
      const { data: existingData } = await supabase
        .from('settings')
        .select('key')
        .eq('key', 'feature_flags')
        .maybeSingle();

      if (existingData) {
        // Update existing
        const { error: updateError } = await supabase
          .from('settings')
          .update({
            value: flagsValue,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'feature_flags');

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('settings')
          .insert({
            key: 'feature_flags',
            value: flagsValue
          });

        if (insertError) throw insertError;
      }

      setOriginalFlags(flags);
      toast.success('Feature flags updated successfully');
    } catch (err: any) {
      console.error('Error saving feature flags:', err);
      setError(err.message);
      toast.error('Failed to save feature flags: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalFlags) {
      setFlags(originalFlags);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading feature flags...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          International Filing Feature Flags
        </CardTitle>
        <CardDescription>
          Toggle international filing endpoints for gradual rollout. Changes take effect immediately for new sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {FLAG_CONFIGS.map((config) => (
            <div
              key={config.key}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={config.key} className="font-medium cursor-pointer">
                    {config.label}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {config.region}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {config.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${flags[config.key] ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {flags[config.key] ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  id={config.key}
                  checked={flags[config.key]}
                  onCheckedChange={() => handleToggle(config.key)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Status</h4>
          <div className="flex flex-wrap gap-2">
            {FLAG_CONFIGS.map((config) => (
              <Badge
                key={config.key}
                variant={flags[config.key] ? 'default' : 'secondary'}
              >
                {config.label.split('(')[0].trim()}: {flags[config.key] ? 'ON' : 'OFF'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={fetchFlags}
            disabled={loading || saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {hasChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click "Save Changes" to apply them.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
