import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Document {
  id: string;
  filing_id: string;
  kind: string;
  url: string;
  sha256: string;
  created_at: string;
}

interface DocumentWebhookProps {
  filingId?: string;
  onDocumentReceived?: (document: Document) => void;
}

export const DocumentWebhook: React.FC<DocumentWebhookProps> = ({ 
  filingId, 
  onDocumentReceived 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!filingId) return;

    // Fetch existing documents for this filing
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('filing_id', filingId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      }
    };

    fetchDocuments();

    // Set up real-time listener for new documents
    setIsListening(true);
    const channel = supabase
      .channel('document-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `filing_id=eq.${filingId}`,
        },
        (payload) => {
          const newDocument = payload.new as Document;
          setDocuments(prev => [newDocument, ...prev]);
          onDocumentReceived?.(newDocument);
          toast.success(`New document received: ${newDocument.kind.toUpperCase()}`);
        }
      )
      .subscribe();

    return () => {
      setIsListening(false);
      supabase.removeChannel(channel);
    };
  }, [filingId, onDocumentReceived]);

  const downloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('Document downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!filingId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>No filing selected for document tracking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Filing Documents
          {isListening && (
            <Badge variant="outline" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Documents generated and received via webhook for this filing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm">Documents will appear here when generated</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div 
                key={document.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getDocumentIcon(document.kind)}
                  <div>
                    <div className="font-medium">
                      {document.kind.toUpperCase()} Document
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(document.created_at)}
                    </div>
                    {document.sha256 && (
                      <div className="text-xs text-gray-400 font-mono">
                        SHA256: {document.sha256.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDocument(
                      document.url, 
                      `document-${document.kind}-${Date.now()}.${document.kind}`
                    )}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isListening && (
          <div className="text-center pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Listening for new documents...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};