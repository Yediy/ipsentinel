import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader, FileCheck } from "lucide-react";
import { useIntakeApi, type IntakeDocument } from "@/hooks/useIntakeApi";
import { toast } from "sonner";

/** Canonical document kind → display label */
const DOC_LABELS: Record<string, string> = {
  spec_pdf: "Patent Specification (PDF)",
  spec_docx: "Patent Specification (DOCX)",
  disclosure_summary: "Disclosure Summary",
  provisional_outline: "Provisional Outline",
  figure_prompts: "Figure Descriptions",
  filing_checklist: "Filing Checklist",
  claim_style_statements: "Claim-Style Statements",
  pdf: "Patent Draft (PDF)",
  docx: "Patent Draft (DOCX)",
  xml: "Filing XML",
};

interface DownloadCenterProps {
  intakeId: string;
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({ intakeId }) => {
  const { listDocuments, getSignedUrl } = useIntakeApi();
  const [documents, setDocuments] = useState<IntakeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [intakeId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await listDocuments(intakeId);
      setDocuments(docs);
    } catch {
      // Documents may not be available yet
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: IntakeDocument) => {
    setDownloading(doc.id);
    try {
      const url = await getSignedUrl(doc.id);
      window.open(url, "_blank");
      toast.success("Download started");
    } catch {
      toast.error("Failed to get download link");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading documents…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Download Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No documents available yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {DOC_LABELS[doc.kind] || doc.kind}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                >
                  {downloading === doc.id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1">Download</span>
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <p>
            Download links expire after 15 minutes. Click the download button
            again to generate a fresh link.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
