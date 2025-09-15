import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Shield, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Brain,
  ArrowRight,
  Download,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Globe
} from "lucide-react";

interface TrademarkClassification {
  suggested_classes: number[];
  descriptions: string;
  raw_response: string;
}

interface ClearanceResults {
  search_results: {
    searched_mark: string;
    total_results: number;
    similar_marks: SearchResult[];
    exact_matches: SearchResult[];
  };
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number;
    concerns: string[];
    recommendations: string[];
  };
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  similarity_score?: number;
  source?: string;
  status?: string;
  mark?: string;
  owner?: string;
}

interface AdvancedTrademarkWizardProps {
  filing_id: string;
  onComplete: () => void;
}

export const AdvancedTrademarkWizard: React.FC<AdvancedTrademarkWizardProps> = ({ 
  filing_id, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    mark_name: '',
    mark_type: 'word',
    goods_services: '',
    business_activity: '',
    industry: '',
    target_market: '',
    filing_basis: '1a_use_in_commerce',
    owner_entity: 'individual'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [classification, setClassification] = useState<TrademarkClassification | null>(null);
  const [clearanceResults, setClearanceResults] = useState<ClearanceResults | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'form' | 'classification' | 'clearance' | 'review' | 'complete'>('form');
  const { toast } = useToast();

  const steps = [
    { id: 'basic', title: 'Basic Information', fields: ['mark_name', 'mark_type'] },
    { id: 'business', title: 'Business Details', fields: ['goods_services', 'business_activity', 'industry'] },
    { id: 'legal', title: 'Legal Basis', fields: ['filing_basis', 'owner_entity'] }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleStepNext = async () => {
    const currentStepData = steps[currentStep];
    const requiredFields = currentStepData.fields;
    
    // Validate required fields
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the ${field.replace(/_/g, ' ')} field.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Move to classification phase
      await performClassification();
    }
  };

  const performClassification = async () => {
    try {
      setIsProcessing(true);
      setCurrentPhase('classification');
      
      toast({
        title: "Analyzing Your Trademark",
        description: "Our AI is determining the appropriate trademark classes..."
      });

      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'trademark_classification',
          filing_id,
          data: formData
        }
      });

      if (error) throw error;

      setClassification(data.classification);
      
      toast({
        title: "Classification Complete",
        description: "Moving to trademark clearance search..."
      });

      // Automatically proceed to clearance
      await performClearanceSearch(data.classification);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to classify trademark",
        variant: "destructive"
      });
      setCurrentPhase('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const performClearanceSearch = async (classificationData: TrademarkClassification) => {
    try {
      setIsProcessing(true);
      setCurrentPhase('clearance');
      
      toast({
        title: "Searching for Conflicts",
        description: "Checking USPTO database for similar trademarks..."
      });

      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'trademark_clearance',
          filing_id,
          data: {
            mark_name: formData.mark_name,
            international_classes: classificationData.suggested_classes
          }
        }
      });

      if (error) throw error;

      setClearanceResults(data.clearance_results);
      setCurrentPhase('review');
      
      const riskLevel = data.clearance_results.risk_assessment.risk_level;
      toast({
        title: "Clearance Search Complete",
        description: `Risk level: ${riskLevel.toUpperCase()}. Review the results below.`,
        variant: riskLevel === 'high' ? 'destructive' : 'default'
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform clearance search",
        variant: "destructive"
      });
      setCurrentPhase('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeTrademark = async () => {
    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'finalize_filing',
          filing_id
        }
      });

      if (error) throw error;

      setCurrentPhase('complete');
      onComplete();
      
      toast({
        title: "Trademark Application Ready",
        description: "Your trademark application is ready for submission to the USPTO."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to finalize trademark",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success bg-success/10 border-success/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const renderFormPhase = () => {
    const step = steps[currentStep];
    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Trademark Application</h3>
            <p className="text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {step.title}
            </CardTitle>
            <CardDescription>
              {step.id === 'basic' && "Tell us about your trademark"}
              {step.id === 'business' && "Describe how you'll use this trademark"}
              {step.id === 'legal' && "Legal requirements for filing"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step.id === 'basic' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mark_name">Trademark Name/Text</Label>
                  <Input
                    id="mark_name"
                    value={formData.mark_name}
                    onChange={(e) => handleInputChange('mark_name', e.target.value)}
                    placeholder="Enter the exact trademark you want to register"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mark_type">Mark Type</Label>
                  <Select
                    value={formData.mark_type}
                    onValueChange={(value) => handleInputChange('mark_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="word">Word Mark</SelectItem>
                      <SelectItem value="design">Design Mark (Logo)</SelectItem>
                      <SelectItem value="composite">Word + Design</SelectItem>
                      <SelectItem value="sound">Sound Mark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step.id === 'business' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="goods_services">Goods and Services</Label>
                  <Textarea
                    id="goods_services"
                    value={formData.goods_services}
                    onChange={(e) => handleInputChange('goods_services', e.target.value)}
                    placeholder="Describe the specific products or services you'll use this trademark for"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_activity">Business Activity</Label>
                  <Textarea
                    id="business_activity"
                    value={formData.business_activity}
                    onChange={(e) => handleInputChange('business_activity', e.target.value)}
                    placeholder="Describe your business activity in detail"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    placeholder="e.g., Technology, Retail, Healthcare"
                  />
                </div>
              </>
            )}

            {step.id === 'legal' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="filing_basis">Filing Basis</Label>
                  <Select
                    value={formData.filing_basis}
                    onValueChange={(value) => handleInputChange('filing_basis', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1a_use_in_commerce">
                        Use in Commerce (1A) - Already using the mark
                      </SelectItem>
                      <SelectItem value="1b_intent_to_use">
                        Intent to Use (1B) - Plan to use the mark
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_entity">Owner Type</Label>
                  <Select
                    value={formData.owner_entity}
                    onValueChange={(value) => handleInputChange('owner_entity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="llc">LLC</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0 || isProcessing}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleStepNext}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  currentStep === steps.length - 1 ? 
                    <Brain className="h-4 w-4 mr-2" /> :
                    <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 
                  currentStep === steps.length - 1 ? 'Analyze Trademark' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProcessingPhase = () => (
    <div className="text-center space-y-6">
      <div className="bg-primary/10 rounded-full p-6 w-24 h-24 mx-auto">
        {currentPhase === 'classification' ? (
          <Brain className="h-12 w-12 text-primary animate-pulse" />
        ) : (
          <Search className="h-12 w-12 text-primary animate-pulse" />
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">
          {currentPhase === 'classification' ? 'Analyzing Classification' : 'Searching for Conflicts'}
        </h3>
        <p className="text-muted-foreground">
          {currentPhase === 'classification' 
            ? 'Determining appropriate USPTO trademark classes...'
            : 'Checking USPTO database for similar trademarks...'
          }
        </p>
      </div>
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );

  const renderReviewPhase = () => {
    if (!classification || !clearanceResults) return null;

    const riskLevel = clearanceResults.risk_assessment.risk_level;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Trademark Analysis Complete</h3>
            <p className="text-muted-foreground">
              Review the classification and clearance results below
            </p>
          </div>
          <Badge className={getRiskColor(riskLevel)}>
            Risk: {riskLevel.toUpperCase()}
          </Badge>
        </div>

        {/* Classification Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Trademark Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Suggested International Classes</Label>
                <div className="flex gap-2 mt-1">
                  {classification.suggested_classes.map((cls) => (
                    <Badge key={cls} variant="outline">Class {cls}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Classification Details</Label>
                <div className="bg-accent/30 p-3 rounded-lg mt-1">
                  <p className="text-sm">{classification.descriptions}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clearance Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Clearance Search Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Similar Marks Found</Label>
                  <p className="text-2xl font-bold text-primary">
                    {clearanceResults.search_results.similar_marks.length}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Risk Score</Label>
                  <p className="text-2xl font-bold">
                    {Math.round(clearanceResults.risk_assessment.risk_score * 100)}%
                  </p>
                </div>
              </div>

              {clearanceResults.risk_assessment.concerns.length > 0 && (
                <Alert className={getRiskColor(riskLevel)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Concerns:</p>
                      {clearanceResults.risk_assessment.concerns.map((concern, index) => (
                        <p key={index} className="text-sm">• {concern}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-sm font-medium">Recommendations</Label>
                <div className="bg-accent/30 p-3 rounded-lg mt-1 space-y-1">
                  {clearanceResults.risk_assessment.recommendations.map((rec, index) => (
                    <p key={index} className="text-sm">• {rec}</p>
                  ))}
                </div>
              </div>

              {clearanceResults.search_results.similar_marks.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Similar Marks Found</Label>
                  <div className="space-y-2 mt-1">
                    {clearanceResults.search_results.similar_marks.map((mark, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{mark.mark}</p>
                            <p className="text-sm text-muted-foreground">
                              Owner: {mark.owner}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {Math.round(mark.similarity_score * 100)}% similar
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentPhase('form')}>
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Form
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            
            <Button 
              onClick={finalizeTrademark} 
              disabled={isProcessing || riskLevel === 'high'}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Finalizing...' : 'Proceed with Filing'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCompletePhase = () => (
    <div className="text-center space-y-6">
      <div className="bg-success/10 rounded-full p-6 w-24 h-24 mx-auto">
        <CheckCircle className="h-12 w-12 text-success" />
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">Trademark Application Complete!</h3>
        <p className="text-muted-foreground">
          Your trademark application is ready for submission to the USPTO
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download TEAS Form
        </Button>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          Submit to USPTO
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${currentPhase === 'form' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={currentPhase === 'form' ? 'text-primary font-medium' : 'text-muted-foreground'}>
              Application
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Brain className={`h-4 w-4 ${['classification', 'clearance'].includes(currentPhase) ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={['classification', 'clearance'].includes(currentPhase) ? 'text-primary font-medium' : 'text-muted-foreground'}>
              AI Analysis
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${currentPhase === 'review' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={currentPhase === 'review' ? 'text-primary font-medium' : 'text-muted-foreground'}>
              Review
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <CheckCircle className={`h-4 w-4 ${currentPhase === 'complete' ? 'text-success' : 'text-muted-foreground'}`} />
            <span className={currentPhase === 'complete' ? 'text-success font-medium' : 'text-muted-foreground'}>
              Complete
            </span>
          </div>
        </div>
      </div>

      {currentPhase === 'form' && renderFormPhase()}
      {['classification', 'clearance'].includes(currentPhase) && renderProcessingPhase()}
      {currentPhase === 'review' && renderReviewPhase()}
      {currentPhase === 'complete' && renderCompletePhase()}
    </div>
  );
};