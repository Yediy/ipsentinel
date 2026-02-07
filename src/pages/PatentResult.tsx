import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Download, ArrowLeft, CheckCircle, 
  Clock, AlertCircle, Mail, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { usePatentRealtime } from "@/hooks/usePatentRealtime";
import { PatentSectionEditor } from "@/components/patent/PatentSectionEditor";
import { PatentGenerationProgress } from "@/components/patent/PatentGenerationProgress";
import { DownloadCenter } from "@/components/patent/provisional/DownloadCenter";
import { StatusView } from "@/components/patent/provisional/StatusView";
import { useIntakeApi, type IntakeStatus } from "@/hooks/useIntakeApi";

const PatentResult = () => {
  const { filingId } = useParams<{ filingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("abstract");
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus | null>(null);

  const { patent, loading, updateSection, saving, refetch } = usePatentRealtime(filingId);
  const { retryGeneration, getIntakeStatus, loading: apiLoading } = useIntakeApi();

  // Load intake linked to this filing
  useEffect(() => {
    if (!filingId) return;
    const loadIntake = async () => {
      const { data } = await supabase
        .from("intakes")
        .select("id, status")
        .eq("filing_id", filingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setIntakeId(data.id);
        setIntakeStatus(data.status as IntakeStatus);
      }
    };
    loadIntake();
  }, [filingId]);

  // Poll intake status when generating/paid
  useEffect(() => {
    if (!intakeId || !["paid", "generating"].includes(intakeStatus || "")) return;
    const interval = setInterval(async () => {
      try {
        const res = await getIntakeStatus(intakeId);
        setIntakeStatus(res.status);
        if (res.status === "ready" || res.status === "failed") {
          clearInterval(interval);
          refetch();
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [intakeId, intakeStatus]);

  const handleRetry = useCallback(async () => {
    if (!intakeId) return;
    try {
      const result = await retryGeneration(intakeId);
      setIntakeStatus(result.status);
    } catch { /* error handled in hook */ }
  }, [intakeId, retryGeneration]);

  const handleDownloadPDF = async () => {
    if (!filingId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-patent-pdf", {
        body: { filing_id: filingId },
      });
      if (error) throw error;
      if (data?.download_url) {
        window.open(data.download_url, "_blank");
        toast({ title: "PDF Generated", description: "Your patent draft PDF is ready for download" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveSection = async (sectionKey: string, content: string) => {
    await updateSection(sectionKey, content);
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-full" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!patent) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Patent Not Found</h2>
        <p className="text-muted-foreground mb-4">The patent draft you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate("/filings")}><ArrowLeft className="w-4 h-4 mr-2" />Back to Filings</Button>
      </div>
    );
  }

  // ── Status-driven views for non-ready states ─────────────────────────
  const effectiveStatus = intakeStatus || (patent.status as IntakeStatus);
  if (["paid", "generating", "failed", "deleted"].includes(effectiveStatus)) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/filings")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Filings
        </Button>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />{patent.title}
            </CardTitle>
            <CardDescription>Provisional Patent Application Draft</CardDescription>
          </CardHeader>
        </Card>
        <StatusView
          status={effectiveStatus}
          onRetry={handleRetry}
          retrying={apiLoading}
          onRestart={() => navigate("/wizard")}
        />
      </div>
    );
  }

  // ── Ready state: full view with download center + editors ────────────
  const isReady = effectiveStatus === "ready" || patent.status === "ready";

  const sections = [
    { key: "abstract", label: "Abstract", content: patent.abstract },
    { key: "background", label: "Background", content: patent.background },
    { key: "summary", label: "Summary", content: patent.summary },
    { key: "detailed_description", label: "Detailed Description", content: patent.detailed_description },
    { key: "claims", label: "Claims", content: patent.claims },
    { key: "figures", label: "Figures", content: patent.generated_content?.figure_descriptions || null },
  ];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/filings")} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Filings
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />{patent.title}
              </CardTitle>
              <CardDescription className="mt-2">Provisional Patent Application Draft</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                <CheckCircle className="w-3 h-3 mr-1" />Ready
              </Badge>
              {patent.generated_content?.tier && (
                <Badge variant="outline" className="capitalize">{patent.generated_content.tier} Tier</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadPDF} disabled={downloading}>
              <Download className="w-4 h-4 mr-2" />{downloading ? "Generating PDF..." : "Download PDF"}
            </Button>
            <Button variant="ghost" onClick={refetch} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
          {patent.generated_content?.generated_at && (
            <p className="text-sm text-muted-foreground mt-4">
              Generated on {new Date(patent.generated_content.generated_at).toLocaleString()}
            </p>
          )}
          {saving && <p className="text-sm text-primary mt-2">Saving changes...</p>}
        </CardContent>
      </Card>

      {/* Download Center */}
      {intakeId && <div className="mb-6"><DownloadCenter intakeId={intakeId} /></div>}

      {/* Section editors */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="relative">
                  {section.label}
                  {section.content && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key}>
                <PatentSectionEditor
                  title={section.label}
                  content={section.content}
                  sectionKey={section.key === "figures" ? "generated_content" : section.key}
                  onSave={(content) => handleSaveSection(section.key === "figures" ? "generated_content" : section.key, content)}
                  saving={saving}
                  isReady={isReady}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-lg">Next Steps</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>Review each section carefully and make any necessary edits</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>Consult with a patent attorney for professional review (recommended)</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>File with the USPTO within 12 months to maintain your priority date</span></li>
            <li className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" /><span className="text-muted-foreground">This is an AI-generated draft and should be reviewed by a professional before filing</span></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatentResult;
