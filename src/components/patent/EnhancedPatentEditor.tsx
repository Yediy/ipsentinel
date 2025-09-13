import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, 
  Loader, 
  Save, 
  Globe, 
  Download,
  Settings,
  MapPin,
  Calendar,
  Languages
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatentEditorProps {
  filing_id: string;
  onBack?: () => void;
}

interface PatentData {
  id: string;
  title: string;
  abstract: string;
  background: string;
  summary: string;
  detailed_description: string;
  claims: string;
  features: string;
  prior_art: string;
  type: string;
  country: string;
  language: string;
  route?: string;
  cn_type?: string;
  needs_translation: boolean;
  translation_status: string;
  priority_date?: string;
  agent_required: boolean;
  agent_contact?: string;
}

export const EnhancedPatentEditor: React.FC<PatentEditorProps> = ({ 
  filing_id, 
  onBack 
}) => {
  const [patent, setPatent] = useState<PatentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    loadPatentData();
  }, [filing_id]);

  const loadPatentData = async () => {
    try {
      const { data, error } = await supabase
        .from('filings')
        .select('*')
        .eq('id', filing_id)
        .single();

      if (error) throw error;
      setPatent(data);
    } catch (error: any) {
      console.error('Failed to load patent data:', error);
      toast.error("Failed to load patent data");
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!patent) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('filings')
        .update({
          title: patent.title,
          abstract: patent.abstract,
          background: patent.background,
          summary: patent.summary,
          detailed_description: patent.detailed_description,
          claims: patent.claims,
          features: patent.features,
          prior_art: patent.prior_art
        })
        .eq('id', filing_id);

      if (error) throw error;
      toast.success("Changes saved successfully");
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleTranslateForChina = async () => {
    if (!patent) return;
    
    setActionLoading('translate');
    try {
      const { data, error } = await supabase.functions.invoke('translation-api', {
        body: {
          filing_id,
          source_lang: patent.language,
          target_lang: 'zh-CN',
          fields: {
            title: patent.title,
            abstract: patent.abstract,
            detailed_description: patent.detailed_description,
            claims: patent.claims
          }
        }
      });

      if (error) throw error;

      toast.success("Translation completed! Fields updated to Chinese.");
      await loadPatentData(); // Refresh data
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || "Translation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGeneratePatentPDF = async () => {
    if (!patent) return;
    
    setActionLoading('generate');
    try {
      const { data, error } = await supabase.functions.invoke('patent-api-integration', {
        body: {
          action: 'generate_patent',
          filing_id
        }
      });

      if (error) throw error;

      toast.success("Patent PDF generated successfully!");
      
      // Open the generated PDF if URL is provided
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Patent generation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNationalPackage = async () => {
    if (!patent) return;
    
    setActionLoading('national');
    try {
      const { data, error } = await supabase.functions.invoke('patent-api-integration', {
        body: {
          action: 'national_package',
          filing_id
        }
      });

      if (error) throw error;

      toast.success("National/Regional package generated!");
      
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
    } catch (error: any) {
      console.error('National package error:', error);
      toast.error(error.message || "Package generation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCnOptions = async () => {
    if (!patent) return;
    
    setActionLoading('cn_options');
    try {
      const { data, error } = await supabase.functions.invoke('patent-api-integration', {
        body: {
          action: 'cn_options',
          filing_id
        }
      });

      if (error) throw error;

      toast.success("CN Filing Options generated!");
      
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      }
    } catch (error: any) {
      console.error('CN options error:', error);
      toast.error(error.message || "CN options generation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const updateField = (field: keyof PatentData, value: string) => {
    if (!patent) return;
    setPatent(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!patent) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Patent not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{patent.title || 'Untitled Patent'}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline">{patent.type}</Badge>
              <Badge variant="secondary">{patent.country}</Badge>
              <Badge variant={patent.language === 'zh-CN' ? 'default' : 'outline'}>
                {patent.language === 'zh-CN' ? '中文' : patent.language.toUpperCase()}
              </Badge>
              {patent.route && <Badge variant="outline">{patent.route.toUpperCase()}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline">
              Back to Dashboard
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Button 
            onClick={handleTranslateForChina}
            disabled={actionLoading !== null}
            variant="outline"
            className="flex items-center gap-2"
          >
            {actionLoading === 'translate' ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            Translate for China
          </Button>
          
          <Button 
            onClick={handleGeneratePatentPDF}
            disabled={actionLoading !== null}
            className="flex items-center gap-2"
          >
            {actionLoading === 'generate' ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Generate Patent PDF
          </Button>
          
          <Button 
            onClick={handleNationalPackage}
            disabled={actionLoading !== null}
            variant="outline"
            className="flex items-center gap-2"
          >
            {actionLoading === 'national' ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            National/Regional Package
          </Button>
          
          <Button 
            onClick={handleCnOptions}
            disabled={actionLoading !== null}
            variant="outline"
            className="flex items-center gap-2"
          >
            {actionLoading === 'cn_options' ? (
              <Loader className="animate-spin h-4 w-4" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            CN Filing Options
          </Button>

          <Button 
            onClick={() => window.open(`/filing/${filing_id}/view`, '_blank')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            View Documents
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'content' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Patent Content
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'metadata' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Filing Details
        </button>
      </div>

      {/* Content Tabs */}
      {activeTab === 'content' && (
        <div className="grid gap-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>Patent Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={patent.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter patent title"
                className="text-lg font-medium"
              />
            </CardContent>
          </Card>

          {/* Abstract */}
          <Card>
            <CardHeader>
              <CardTitle>Abstract</CardTitle>
              <p className="text-sm text-muted-foreground">
                Brief summary of the invention (typically 150 words or less)
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={patent.abstract}
                onChange={(e) => updateField('abstract', e.target.value)}
                placeholder="Provide a concise summary of your invention"
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Background */}
            <Card>
              <CardHeader>
                <CardTitle>Background</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={patent.background}
                  onChange={(e) => updateField('background', e.target.value)}
                  placeholder="Describe the technical field and existing problems"
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={patent.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Summarize the key aspects of your invention"
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Description */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Description</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive technical description of your invention
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={patent.detailed_description}
                onChange={(e) => updateField('detailed_description', e.target.value)}
                placeholder="Provide detailed technical description of how your invention works"
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Claims */}
            <Card>
              <CardHeader>
                <CardTitle>Claims</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define the scope of protection (one claim per line)
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={patent.claims}
                  onChange={(e) => updateField('claims', e.target.value)}
                  placeholder="1. A method comprising...&#10;2. The method of claim 1, wherein..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={patent.features}
                  onChange={(e) => updateField('features', e.target.value)}
                  placeholder="List the main technical features and advantages"
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Prior Art */}
          <Card>
            <CardHeader>
              <CardTitle>Prior Art</CardTitle>
              <p className="text-sm text-muted-foreground">
                Describe existing solutions and how your invention differs
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={patent.prior_art}
                onChange={(e) => updateField('prior_art', e.target.value)}
                placeholder="Reference existing technology and explain improvements"
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'metadata' && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Filing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <p className="text-sm text-muted-foreground mt-1">{patent.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {patent.language === 'zh-CN' ? 'Chinese (Simplified)' : patent.language}
                  </p>
                </div>
                {patent.route && (
                  <div>
                    <label className="text-sm font-medium">Filing Route</label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{patent.route}</p>
                  </div>
                )}
                {patent.cn_type && (
                  <div>
                    <label className="text-sm font-medium">CN Type</label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{patent.cn_type}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium">Translation Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={patent.translation_status === 'completed' ? 'default' : 'secondary'}>
                    {patent.translation_status}
                  </Badge>
                  {patent.needs_translation && (
                    <Badge variant="outline">Translation Needed</Badge>
                  )}
                </div>
              </div>

              {patent.priority_date && (
                <div>
                  <label className="text-sm font-medium">Priority Date</label>
                  <p className="text-sm text-muted-foreground mt-1">{patent.priority_date}</p>
                </div>
              )}

              {patent.agent_required && (
                <div>
                  <label className="text-sm font-medium">Agent Required</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Yes {patent.agent_contact ? `- ${patent.agent_contact}` : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};