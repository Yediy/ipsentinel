import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Download, ArrowLeft, CheckCircle, 
  Clock, AlertCircle, Copy, Mail 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

const PatentResult = () => {
  const { filingId } = useParams<{ filingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patent, setPatent] = useState<PatentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("abstract");

  useEffect(() => {
    if (filingId) {
      fetchPatent();
    }
  }, [filingId]);

  const fetchPatent = async () => {
    try {
      const { data, error } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filingId)
        .single();

      if (error) throw error;
      setPatent(data as PatentDraft);
    } catch (error) {
      console.error('Error fetching patent:', error);
      toast({
        title: "Error",
        description: "Failed to load patent draft",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!filingId) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-patent-pdf', {
        body: { filing_id: filingId }
      });

      if (error) throw error;

      if (data?.download_url) {
        window.open(data.download_url, '_blank');
        toast({
          title: "PDF Generated",
          description: "Your patent draft PDF is ready for download"
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${section} copied to clipboard`
    });
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patent) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Patent Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The patent draft you're looking for doesn't exist or you don't have access.
        </p>
        <Button onClick={() => navigate('/filings')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Filings
        </Button>
      </div>
    );
  }

  const isReady = patent.status === 'ready';
  const isGenerating = patent.status === 'generating';

  const sections = [
    { key: 'abstract', label: 'Abstract', content: patent.abstract },
    { key: 'background', label: 'Background', content: patent.background },
    { key: 'summary', label: 'Summary', content: patent.summary },
    { key: 'detailed_description', label: 'Detailed Description', content: patent.detailed_description },
    { key: 'claims', label: 'Claims', content: patent.claims },
    { key: 'figures', label: 'Figures', content: patent.generated_content?.figure_descriptions },
  ];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/filings')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Filings
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                {patent.title}
              </CardTitle>
              <CardDescription className="mt-2">
                Provisional Patent Application Draft
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isReady && (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              )}
              {isGenerating && (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </Badge>
              )}
              {patent.generated_content?.tier && (
                <Badge variant="outline" className="capitalize">
                  {patent.generated_content.tier} Tier
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleDownloadPDF} 
              disabled={!isReady || downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </Button>
            <Button variant="outline" disabled={!isReady}>
              <Mail className="w-4 h-4 mr-2" />
              Email Draft
            </Button>
          </div>
          {patent.generated_content?.generated_at && (
            <p className="text-sm text-muted-foreground mt-4">
              Generated on {new Date(patent.generated_content.generated_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {isGenerating ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Generating Your Patent Draft</h3>
            <p className="text-muted-foreground">
              Our AI is creating your provisional patent application. This typically takes 5-10 minutes.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              You'll receive an email when it's ready. Feel free to leave this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
                {sections.map((section) => (
                  <TabsTrigger 
                    key={section.key} 
                    value={section.key}
                    disabled={!section.content}
                  >
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {sections.map((section) => (
                <TabsContent key={section.key} value={section.key}>
                  <div className="relative">
                    {section.content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0"
                        onClick={() => copyToClipboard(section.content!, section.label)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <h3 className="text-lg font-semibold mb-4">{section.label}</h3>
                      {section.content ? (
                        <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                          {section.content}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">
                          This section has not been generated yet.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Review each section carefully and make any necessary edits</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Consult with a patent attorney for professional review (recommended)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>File with the USPTO within 12 months to maintain your priority date</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                Remember: This is an AI-generated draft and should be reviewed by a professional before filing
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatentResult;
