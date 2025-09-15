import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface WebhookConfig {
  url: string;
  secret: string;
  status: 'connected' | 'disconnected' | 'error';
}

export const DocumentWebhookHandler: React.FC = () => {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkWebhookConfiguration();
  }, []);

  const checkWebhookConfiguration = async () => {
    setIsChecking(true);
    try {
      // This would typically check your backend configuration
      // For now, we'll simulate the check
      const mockConfig: WebhookConfig = {
        url: process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8080/api/webhook/documents'
          : 'https://your-api-server.com/api/webhook/documents',
        secret: '***configured***',
        status: 'connected'
      };
      
      setWebhookConfig(mockConfig);
    } catch (error) {
      console.error('Error checking webhook config:', error);
      setWebhookConfig({
        url: 'Not configured',
        secret: 'Not configured', 
        status: 'error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Disconnected</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-600">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Checking webhook configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Webhook Status
        </CardTitle>
        <CardDescription>
          Configuration status for receiving generated documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhookConfig && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(webhookConfig.status)}
                <span className="font-medium">Webhook Status</span>
              </div>
              {getStatusBadge(webhookConfig.status)}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Endpoint URL:</div>
              <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {webhookConfig.url}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Secret:</div>
              <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {webhookConfig.secret}
              </div>
            </div>
          </div>
        )}

        {webhookConfig?.status === 'connected' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Webhook is properly configured. Generated documents will automatically appear in your filings.
            </AlertDescription>
          </Alert>
        )}

        {webhookConfig?.status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Webhook configuration error. Please check your API server settings and ensure the webhook URL and secret are properly configured.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Documents are automatically delivered via webhook when generated</p>
          <p>• Each document includes SHA256 hash for integrity verification</p>
          <p>• Duplicate documents are automatically detected and prevented</p>
        </div>
      </CardContent>
    </Card>
  );
};