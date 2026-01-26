import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
const CONSENT_KEY = 'ipsentinel_cookie_consent';

// Check if analytics consent has been given
const hasAnalyticsConsent = (): boolean => {
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.analytics === true;
    }
  } catch (e) {
    // Invalid consent data
  }
  return false;
};

export const initPostHog = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
      opt_out_capturing_by_default: true, // Respect cookie consent
    });

    // Apply consent on init
    if (hasAnalyticsConsent()) {
      posthog.opt_in_capturing();
    }
  }
};

// Track funnel events (respects consent)
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (POSTHOG_KEY && hasAnalyticsConsent()) {
    posthog.capture(eventName, properties);
  }
};

// Funnel-specific tracking helpers
export const trackWizardStart = (wizardType: 'patent' | 'trademark' | 'copyright') => {
  trackEvent('wizard_started', { 
    wizard_type: wizardType,
    timestamp: new Date().toISOString()
  });
};

export const trackWizardStep = (wizardType: string, step: number, stepName: string) => {
  trackEvent('wizard_step_completed', { 
    wizard_type: wizardType, 
    step, 
    step_name: stepName,
    timestamp: new Date().toISOString()
  });
};

export const trackWizardComplete = (wizardType: string, filingId?: string) => {
  trackEvent('wizard_completed', { 
    wizard_type: wizardType, 
    filing_id: filingId,
    timestamp: new Date().toISOString()
  });
};

export const trackPaymentInitiated = (filingId: string, amount: number) => {
  trackEvent('payment_initiated', { filing_id: filingId, amount });
};

export const trackPaymentSuccess = (filingId: string, amount: number) => {
  trackEvent('payment_success', { filing_id: filingId, amount });
};

export const trackPaymentFailed = (filingId: string, reason?: string) => {
  trackEvent('payment_failed', { filing_id: filingId, reason });
};

export const trackDocumentGenerated = (filingId: string, docType: string) => {
  trackEvent('document_generated', { filing_id: filingId, doc_type: docType });
};

export const trackDocumentDownloaded = (filingId: string, docType: string) => {
  trackEvent('document_downloaded', { filing_id: filingId, doc_type: docType });
};

// User identification
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (POSTHOG_KEY && hasAnalyticsConsent()) {
    posthog.identify(userId, traits);
  }
};

export const resetUser = () => {
  if (POSTHOG_KEY) {
    posthog.reset();
  }
};

export default posthog;
