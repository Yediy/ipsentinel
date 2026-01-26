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
import { Search, CheckCircle, Clock, Sparkles, Brain, ArrowRight, AlertTriangle } from "lucide-react";
import { trackWizardStart, trackWizardStep, trackWizardComplete } from "@/lib/posthog";

// Type definitions for improved type safety across the application
interface FilingError extends Error {
  message: string;
  code?: string;
}

interface FilingResponse {
  data: any;
  error: FilingError | null;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  similarity_score?: number;
  source?: string;
  status?: string;
}

interface TrademarSearchResults {
  similar_marks: SearchResult[];
  exact_matches: SearchResult[];
  risk_assessment: {
    level: 'low' | 'medium' | 'high';
    score: number;
    concerns: string[];
    recommendations: string[];
  };
}

interface ClassificationResult {
  suggested_classes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  confidence: number;
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  logError?: boolean;
}

function handleError(
  error: unknown, 
  context: string, 
  options: ErrorHandlerOptions = {}
): string {
  const { 
    showToast = true, 
    fallbackMessage = 'An unexpected error occurred',
    logError = true 
  } = options;
  
  let errorMessage = fallbackMessage;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  if (logError) {
    console.error(`Error in ${context}:`, error);
  }
  
  return errorMessage;
}

interface PatentFormData {
  title: string;
  abstract: string;
  background: string;
  summary: string;
  detailed_description: string;
  claims: string;
  features: string;
  prior_art: string;
  problem: string;
  solution: string;
}

interface FileUploadData {
  file: File;
  type: string;
  description?: string;
}

interface TrademarkQuestion {
  id: string;
  type: 'text' | 'select' | 'textarea' | 'multi-select';
  question: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  validation?: (value: string) => boolean;
}

interface TrademarkInterviewWizardProps {
  filing_id: string;
  onComplete: (data: Record<string, string>) => void;
  onBack?: () => void;
}

const TrademarkInterviewWizard = ({ filing_id, onComplete, onBack }: TrademarkInterviewWizardProps) => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // Track wizard start
    trackWizardStart('trademark');
    
    const fetchSessionId = async () => {
      try {
        const { data, error } = await supabase
          .from('filings')
          .select('session_id')
          .eq('id', filing_id)
          .single();

        if (error) {
          throw error;
        }

        // Session initialized successfully
        console.log('Session initialized for filing:', filing_id);
      } catch (error) {
        console.error('Failed to fetch session ID:', error);
        toast({
          title: "Error!",
          description: "Failed to retrieve session information.",
          variant: "destructive",
        });
      }
    };

    fetchSessionId();
  }, [filing_id, toast]);

  const trademarkQuestions: TrademarkQuestion[] = [
    {
      id: "email",
      type: "text",
      question: "Let's start with your contact information. What's your email address?",
      placeholder: "business@example.com",
      required: true
    },
    {
      id: "owner_type",
      type: "select", 
      question: "Are you filing as an individual or as a business entity?",
      options: ["Individual", "LLC", "Corporation", "Partnership", "Other"],
      required: true
    },
    {
      id: "mark_name",
      type: "text",
      question: "What is the exact trademark you want to register?",
      placeholder: "Enter your trademark name exactly as you want it registered",
      required: true
    },
    {
      id: "mark_type",
      type: "select",
      question: "What type of trademark is this?",
      options: ["Word Mark", "Design Mark", "Combined Word and Design Mark", "Sound Mark", "Color Mark"],
      required: true
    },
    {
      id: "goods_services",
      type: "textarea",
      question: "Please describe the goods and/or services you'll use this trademark with.",
      placeholder: "Be specific about your products or services. For example: 'Online retail store services featuring clothing' or 'Computer software for data analysis'",
      required: true
    },
    {
      id: "filing_basis",
      type: "select",
      question: "What is your filing basis?",
      options: [
        "Intent to Use (1(b)) - I plan to use this mark in commerce",
        "Use in Commerce (1(a)) - I am already using this mark in commerce",
        "Foreign Application (44(d)) - Based on foreign application",
        "Foreign Registration (44(e)) - Based on foreign registration"
      ],
      required: true
    },
    {
      id: "first_use_date",
      type: "text",
      question: "When did you first use this trademark in commerce? (Leave blank if Intent to Use)",
      placeholder: "MM/DD/YYYY or 'Not yet used'"
    },
    {
      id: "commerce_use_date", 
      type: "text",
      question: "When did you first use this trademark in interstate commerce? (Leave blank if Intent to Use)",
      placeholder: "MM/DD/YYYY or 'Not yet used'"
    },
    {
      id: "priority_claim",
      type: "text", 
      question: "Do you want to claim priority based on an earlier filed foreign application?",
      placeholder: "Enter foreign application number if applicable, or 'No'"
    },
    {
      id: "specimen_description",
      type: "textarea",
      question: "How do you use or plan to use this trademark? Describe how it appears on your products/services.",
      placeholder: "For example: 'Displayed on product packaging and website header' or 'Used in advertising materials for consulting services'"
    },
    {
      id: "similar_marks",
      question: "Are you aware of any similar trademarks in your industry?",
      placeholder: "List any competitors or similar business names you know of...",
      type: "textarea"
    },
    {
      id: "attorney_info",
      type: "textarea",
      question: "Do you have an attorney representing you? If so, please provide their information.",
      placeholder: "Attorney name, firm, and contact information, or 'None - filing pro se'"
    }
  ];

  const handleSearch = async () => {
    if (!responses.mark_name) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('tess-search', {
        body: { 
          mark: responses.mark_name,
          goods_services: responses.goods_services || ""
        }
      });

      if (error) throw error;

      if (data?.results) {
        setSearchResults(data.results);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search temporarily unavailable. We will perform a comprehensive search later.';
      toast({
        title: "Search Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = () => {
    if (trademarkQuestions[currentQuestion]?.required && !currentAnswer.trim()) {
      toast({
        title: "Required Field",
        description: "This field is required",
        variant: "destructive"
      });
      return;
    }

    setResponses(prev => ({
      ...prev,
      [trademarkQuestions[currentQuestion].id]: currentAnswer
    }));

    if (currentQuestion < trademarkQuestions.length - 1) {
      // Track step completion
      trackWizardStep('trademark', currentQuestion + 1, trademarkQuestions[currentQuestion].id);
      
      setCurrentQuestion(prev => prev + 1);
      setCurrentAnswer("");
      
      // Trigger search when we have the mark name
      if (trademarkQuestions[currentQuestion + 1].id === "similar_marks" && responses.mark_name) {
        handleSearch();
      }
    } else {
      // Complete the interview
      const finalResponses = {
        ...responses,
        [trademarkQuestions[currentQuestion].id]: currentAnswer
      };
      
      // Track wizard completion
      trackWizardComplete('trademark', filing_id);
      
      onComplete(finalResponses);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      const prevQuestion = trademarkQuestions[currentQuestion - 1];
      setCurrentAnswer(responses[prevQuestion.id] || "");
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const renderInput = () => {
    const question = trademarkQuestions[currentQuestion];
    
    switch (question.type) {
      case 'select':
        return (
          <Select value={currentAnswer} onValueChange={setCurrentAnswer}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))
              }
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[100px]"
          />
        );
      
      default:
        return (
          <Input
            type={question.id.includes('email') ? 'email' : 'text'}
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={question.placeholder}
          />
        );
    }
  };

  const progress = ((currentQuestion + 1) / trademarkQuestions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Trademark Registration Interview</h1>
        <p className="text-muted-foreground">Answer a few questions to prepare your trademark application</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Question {currentQuestion + 1} of {trademarkQuestions.length}
            </CardTitle>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <Label className="text-lg font-medium mb-4 block">
              {trademarkQuestions[currentQuestion]?.question}
            </Label>
            {renderInput()}
          </div>

          {/* Show search results if available */}
          {searchResults.length > 0 && currentQuestion === trademarkQuestions.findIndex(q => q.id === "similar_marks") && (
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                <div className="mt-2">
                  <p className="font-medium mb-2">We found {searchResults.length} potentially similar trademarks:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div key={result.id || index} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-muted-foreground">{result.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Don't worry - our legal experts will conduct a comprehensive clearance search and help you navigate any potential conflicts.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            {currentQuestion > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              className="ml-auto"
              disabled={trademarkQuestions[currentQuestion]?.required && !currentAnswer.trim()}
            >
              {currentQuestion === trademarkQuestions.length - 1 ? 'Complete Interview' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {onBack && (
        <div className="text-center">
          <Button variant="ghost" onClick={onBack}>
            ← Back to Filing Options
          </Button>
        </div>
      )}
    </div>
  );
};

export default TrademarkInterviewWizard;
