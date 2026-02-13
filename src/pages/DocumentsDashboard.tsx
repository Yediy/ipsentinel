import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileText,
  FileCheck,
  Search,
  Share2,
  Copy,
  Loader,
  FolderOpen,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

const KIND_ICONS: Record<string, string> = {
  spec_pdf: "📄",
  spec_docx: "📝",
  filing_checklist: "✅",
  pdf: "📄",
  docx: "📝",
  xml: "📋",
};

const KIND_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  docx: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  xml: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

interface DocumentRow {
  id: string;
  kind: string;
  doc_type: string | null;
  created_at: string;
  storage_key: string | null;
  filing_id: string;
  filing_title: string;
  delete_after: string | null;
}

const DocumentsDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase
        .from("documents")
        .select("id, kind, doc_type, created_at, storage_key, filing_id, delete_after")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch filing titles
      const filingIds = [...new Set((docs || []).map((d) => d.filing_id))];
      const { data: filings } = await supabase
        .from("filings")
        .select("id, title")
        .in("id", filingIds);

      const filingMap = new Map(
        (filings || []).map((f) => [f.id, f.title])
      );

      setDocuments(
        (docs || []).map((d) => ({
          ...d,
          filing_title: filingMap.get(d.filing_id) || "Untitled Filing",
        }))
      );
    } catch (err: any) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: DocumentRow) => {
    if (!doc.storage_key) {
      toast.error("No storage key available");
      return;
    }
    setDownloading(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "intake-documents",
        { body: { action: "signed-url", document_id: doc.id } }
      );
      if (error) throw error;
      window.open(data.url, "_blank");
      toast.success("Download started");
    } catch {
      toast.error("Failed to generate download link");
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyLink = async (doc: DocumentRow) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "intake-documents",
        { body: { action: "signed-url", document_id: doc.id } }
      );
      if (error) throw error;
      await navigator.clipboard.writeText(data.url);
      toast.success("Link copied — expires in 15 minutes");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const getDocLabel = (doc: DocumentRow) =>
    DOC_LABELS[doc.doc_type || ""] || DOC_LABELS[doc.kind] || doc.doc_type || doc.kind;

  const getFormatBadge = (kind: string) => {
    const label = kind.toUpperCase();
    const cls = KIND_COLORS[kind] || "bg-muted text-muted-foreground";
    return <Badge variant="secondary" className={cls}>{label}</Badge>;
  };

  const getRetentionBadge = (deleteAfter: string | null) => {
    if (!deleteAfter) return null;
    const remaining = Math.max(
      0,
      Math.round((new Date(deleteAfter).getTime() - Date.now()) / (1000 * 60 * 60))
    );
    if (remaining <= 12) {
      return <Badge variant="destructive" className="text-xs">Expires in {remaining}h</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{remaining}h remaining</Badge>;
  };

  // Filtering
  const filtered = documents.filter((doc) => {
    const label = getDocLabel(doc).toLowerCase();
    const title = doc.filing_title.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || label.includes(q) || title.includes(q);
    const matchesType = typeFilter === "all" || doc.kind === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueKinds = [...new Set(documents.map((d) => d.kind))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Document Center</h1>
        <p className="text-muted-foreground mt-1">
          All generated documents across your filings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-background border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {documents.filter((d) => d.kind === "pdf").length}
                </p>
                <p className="text-sm text-muted-foreground">PDF Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {documents.filter((d) => d.kind === "docx").length}
                </p>
                <p className="text-sm text-muted-foreground">DOCX Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-background border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by document or filing name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Documents ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading documents…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-3">
                {documents.length === 0
                  ? "No documents generated yet. Complete a filing to see documents here."
                  : "No documents match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Filing</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {KIND_ICONS[doc.doc_type || ""] || KIND_ICONS[doc.kind] || "📋"}
                          </span>
                          <span className="font-medium text-sm text-foreground">
                            {getDocLabel(doc)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {doc.filing_title}
                        </span>
                      </TableCell>
                      <TableCell>{getFormatBadge(doc.kind)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(doc.created_at), "MMM d, yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>{getRetentionBadge(doc.delete_after)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc)}
                            disabled={downloading === doc.id}
                            className="gap-1"
                          >
                            {downloading === doc.id ? (
                              <Loader className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden md:inline">Download</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(doc)}
                            title="Copy shareable link (15 min expiry)"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
            Download links expire after 15 minutes. Shared links are temporary and respect the 72-hour data retention policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsDashboard;
