import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Filing {
  id: string;
  type: string;
  title: string;
  status: string;
  payment_status: string;
  created_at: string;
  country: string;
  documents?: {
    id: string;
    kind: string;
    url: string;
    created_at: string;
  }[];
}

const FilingsDashboard = () => {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFilings();
  }, []);

  const fetchFilings = async () => {
    try {
      const { data, error } = await supabase
        .from('filings')
        .select(`
          *,
          documents (
            id,
            kind,
            url,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFilings(data || []);
    } catch (error) {
      console.error('Error fetching filings:', error);
      toast({
        title: "Error",
        description: "Failed to load your filings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('filings')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'generating':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your filings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">My Filings</h1>
          </div>
          <Button asChild>
            <Link to="/filing/wizard">Start New Filing</Link>
          </Button>
        </div>

        {filings.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <CardTitle>No Filings Yet</CardTitle>
              <CardDescription>
                Start your first IP filing to protect your ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/filing/wizard">Create Your First Filing</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filings.map((filing) => (
              <Card key={filing.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {filing.title}
                      </CardTitle>
                      <CardDescription>
                        {filing.type.charAt(0).toUpperCase() + filing.type.slice(1)} • {filing.country}
                      </CardDescription>
                    </div>
                    {getStatusIcon(filing.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(filing.status)}>
                      {filing.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getStatusColor(filing.payment_status)}>
                      {filing.payment_status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Filed: {new Date(filing.created_at).toLocaleDateString()}
                  </p>

                  {filing.documents && filing.documents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Documents:</p>
                      {filing.documents.map((doc) => (
                        <Button
                          key={doc.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => {
                            if (doc.url.startsWith('http')) {
                              window.open(doc.url, '_blank');
                            } else {
                              downloadDocument(
                                doc.url, 
                                `${filing.title}_${doc.kind}.${doc.kind === 'pdf' ? 'pdf' : 'txt'}`
                              );
                            }
                          }}
                        >
                          <span>{doc.kind.toUpperCase()}</span>
                          <Download className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  )}

                  {filing.status === 'ready' && (!filing.documents || filing.documents.length === 0) && (
                    <p className="text-sm text-gray-500 italic">
                      Documents are being prepared...
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilingsDashboard;