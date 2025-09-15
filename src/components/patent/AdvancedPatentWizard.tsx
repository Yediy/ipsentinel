import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  FileText, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Brain,
  ArrowRight,
  Download,
  Eye,
  Loader2
} from "lucide-react";

interface ConversationStep {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  options?: string[];
  optional?: boolean;
}

interface PatentSection {
  type: string;
  content: string;
  id: string;
  error?: boolean;
}

interface AdvancedPatentWizardProps {
  filing_id: string;
  onComplete: () => void;
}

export const AdvancedPatentWizard: React.FC<AdvancedPatentWizardProps> = ({ 
  filing_id, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [conversationFlow, setConversationFlow] = useState<ConversationStep[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [generatedSections, setGeneratedSections] = useState<PatentSection[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'interview' | 'generation' | 'review' | 'complete'>('interview');
  const { toast } = useToast();

  useEffect(() => {
    initializeSession();
  }, [filing_id]);

  const initializeSession = async () => {
    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'start_session',
          filing_id,
          filing_type: 'patent'
        }
      });

      if (error) throw error;

      setSessionId(data.session_id);
      setConversationFlow(data.conversation_flow.steps);
      setCurrentStep(0);
      
      toast({
        title: "AI Patent Agent Ready",
        description: "Let's start building your patent application together."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize AI session",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStepSubmit = async () => {
    if (currentStep >= conversationFlow.length) return;
    
    const step = conversationFlow[currentStep];
    const response = responses[step.id];
    
    if (!response && !step.optional) {
      toast({
        title: "Response Required",
        description: "Please provide an answer before continuing.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'process_conversation',
          filing_id,
          conversation_step: step.id,
          data: {
            response,
            needs_ai_processing: step.type === 'textarea' && response?.length > 100
          }
        }
      });

      if (error) throw error;

      if (data.ai_response) {
        setAiResponse(data.ai_response);
      }

      if (data.conversation_complete) {
        setCurrentPhase('generation');
        await generatePatentSections();
      } else {
        setCurrentStep(currentStep + 1);
        setAiResponse('');
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process response",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePatentSections = async () => {
    try {
      setIsProcessing(true);
      
      toast({
        title: "Generating Patent Sections",
        description: "Our AI is drafting your patent application using advanced legal templates..."
      });

      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'generate_sections',
          filing_id,
          data: responses
        }
      });

      if (error) throw error;

      setGeneratedSections(data.sections);
      setCurrentPhase('review');
      
      toast({
        title: "Patent Draft Complete",
        description: `Generated ${data.sections.length} sections. Please review below.`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate patent sections",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = async () => {
    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'generate_pdf',
          filing_id
        }
      });

      if (error) throw error;

      toast({
        title: "PDF Generated Successfully",
        description: "Your USPTO-compliant patent application is ready for download."
      });

      // Open PDF in new tab
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeFiling = async () => {
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
        title: "Patent Application Ready",
        description: "Your patent application is ready for submission to the USPTO."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to finalize filing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderInterviewPhase = () => {
    if (conversationFlow.length === 0) return null;
    
    const step = conversationFlow[currentStep];
    const progress = ((currentStep + 1) / conversationFlow.length) * 100;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">AI Patent Interview</h3>
            <p className="text-muted-foreground">
              Step {currentStep + 1} of {conversationFlow.length}
            </p>
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {step?.question}
            </CardTitle>
            {step?.optional && (
              <Badge variant="secondary">Optional</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {step?.type === 'text' && (
              <Input
                value={responses[step.id] || ''}
                onChange={(e) => setResponses({...responses, [step.id]: e.target.value})}
                placeholder="Enter your response..."
              />
            )}

            {step?.type === 'textarea' && (
              <Textarea
                value={responses[step.id] || ''}
                onChange={(e) => setResponses({...responses, [step.id]: e.target.value})}
                placeholder="Provide detailed information..."
                rows={4}
              />
            )}

            {step?.type === 'select' && (
              <Select
                value={typeof responses[step.id] === 'string' ? responses[step.id] as string : ''}
                onValueChange={(value) => setResponses({...responses, [step.id]: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {step.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {aiResponse && (
              <div className="bg-accent/30 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-primary mt-1" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">AI Feedback:</p>
                    <p>{aiResponse}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0 || isProcessing}
              >
                Previous
              </Button>
              
              <Button
                onClick={handleStepSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  currentStep === conversationFlow.length - 1 ? 
                    <CheckCircle className="h-4 w-4 mr-2" /> :
                    <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 
                  currentStep === conversationFlow.length - 1 ? 'Generate Patent' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGenerationPhase = () => (
    <div className="text-center space-y-6">
      <div className="bg-primary/10 rounded-full p-6 w-24 h-24 mx-auto">
        <Brain className="h-12 w-12 text-primary animate-pulse" />
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">Generating Your Patent Application</h3>
        <p className="text-muted-foreground">
          Our AI is using advanced legal templates to draft your patent sections...
        </p>
      </div>
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );

  const renderReviewPhase = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Review Patent Draft</h3>
          <p className="text-muted-foreground">
            Review the AI-generated sections and make any necessary edits
          </p>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success">
          Draft Complete
        </Badge>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {generatedSections.map((section, index) => (
          <AccordionItem key={section.id} value={`section-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">
                    {section.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  {section.error && (
                    <div className="text-sm text-destructive">
                      Generation error - needs attention
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-accent/30 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {section.content}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentPhase('interview')}>
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back to Interview
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePDF} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Generating...' : 'Generate PDF'}
          </Button>
          
          <Button onClick={finalizeFiling} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Finalizing...' : 'Finalize Patent'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCompletePhase = () => (
    <div className="text-center space-y-6">
      <div className="bg-success/10 rounded-full p-6 w-24 h-24 mx-auto">
        <CheckCircle className="h-12 w-12 text-success" />
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">Patent Application Complete!</h3>
        <p className="text-muted-foreground">
          Your patent application is ready for submission to the USPTO
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={generatePDF}>
          <Download className="h-4 w-4 mr-2" />
          Download USPTO PDF
        </Button>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
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
            <Clock className={`h-4 w-4 ${currentPhase === 'interview' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={currentPhase === 'interview' ? 'text-primary font-medium' : 'text-muted-foreground'}>
              Interview
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Brain className={`h-4 w-4 ${currentPhase === 'generation' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={currentPhase === 'generation' ? 'text-primary font-medium' : 'text-muted-foreground'}>
              AI Generation
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Eye className={`h-4 w-4 ${currentPhase === 'review' ? 'text-primary' : 'text-muted-foreground'}`} />
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

      {currentPhase === 'interview' && renderInterviewPhase()}
      {currentPhase === 'generation' && renderGenerationPhase()}
      {currentPhase === 'review' && renderReviewPhase()}
      {currentPhase === 'complete' && renderCompletePhase()}
    </div>
  );
};