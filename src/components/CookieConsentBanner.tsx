import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, X, Settings, Check } from "lucide-react";
import { Link } from "react-router-dom";
import posthog from 'posthog-js';

const CONSENT_KEY = 'ipsentinel_cookie_consent';
const CONSENT_VERSION = 'v1';

interface ConsentSettings {
  version: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConsentSettings>({
    version: CONSENT_VERSION,
    essential: true, // Always required
    analytics: false,
    marketing: false,
    timestamp: ''
  });

  useEffect(() => {
    // Check if consent has been given
    const storedConsent = localStorage.getItem(CONSENT_KEY);
    
    if (storedConsent) {
      try {
        const parsed = JSON.parse(storedConsent) as ConsentSettings;
        
        // Check if consent version matches
        if (parsed.version === CONSENT_VERSION) {
          setSettings(parsed);
          applyConsent(parsed);
          return;
        }
      } catch (e) {
        // Invalid consent data, show banner
      }
    }
    
    // Show banner for first-time visitors or outdated consent
    setShowBanner(true);
  }, []);

  const applyConsent = (consent: ConsentSettings) => {
    // Apply analytics consent
    if (consent.analytics) {
      // Enable PostHog tracking
      posthog.opt_in_capturing();
    } else {
      // Disable PostHog tracking
      posthog.opt_out_capturing();
    }
  };

  const saveConsent = (consent: ConsentSettings) => {
    const consentWithTimestamp = {
      ...consent,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setSettings(consentWithTimestamp);
    applyConsent(consentWithTimestamp);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      ...settings,
      analytics: true,
      marketing: true
    });
  };

  const handleAcceptEssential = () => {
    saveConsent({
      ...settings,
      analytics: false,
      marketing: false
    });
  };

  const handleSavePreferences = () => {
    saveConsent(settings);
  };

  const handleClose = () => {
    // Closing without action defaults to essential only
    handleAcceptEssential();
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <Card className="mx-auto max-w-4xl shadow-lg border-2">
        <CardContent className="p-4 sm:p-6">
          {!showSettings ? (
            // Simple banner view
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg">Cookie Preferences</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                      By clicking "Accept All", you consent to our use of cookies. You can manage your preferences 
                      or learn more in our{' '}
                      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Preferences
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAcceptEssential}
                >
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            // Detailed settings view
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cookie className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg">Cookie Settings</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Essential Cookies - Always required */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <Label className="font-medium">Essential Cookies</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for the website to function properly. These cannot be disabled.
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="analytics" className="font-medium cursor-pointer">Analytics Cookies</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Help us understand how visitors interact with our website using PostHog analytics.
                    </p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={settings.analytics}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, analytics: checked }))}
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="marketing" className="font-medium cursor-pointer">Marketing Cookies</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Used to track visitors across websites and display relevant advertisements.
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={settings.marketing}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-between items-center pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  ← Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptEssential}
                  >
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePreferences}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                For more information, see our{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                {' '}and{' '}
                <Link to="/dpa" className="text-primary hover:underline">Data Processing Agreement</Link>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to check consent status
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentSettings | null>(null);

  useEffect(() => {
    const storedConsent = localStorage.getItem(CONSENT_KEY);
    if (storedConsent) {
      try {
        setConsent(JSON.parse(storedConsent));
      } catch (e) {
        // Invalid consent
      }
    }
  }, []);

  return {
    hasConsent: consent !== null,
    analyticsEnabled: consent?.analytics ?? false,
    marketingEnabled: consent?.marketing ?? false,
    consent
  };
}
