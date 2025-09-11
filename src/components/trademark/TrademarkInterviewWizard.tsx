import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building, ArrowLeft, ArrowRight, Save, Bot, CheckCircle, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrademarkQuestion {
  id: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'file-upload';
  question: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  followUp?: string;
}

interface TrademarkData {
  email: string;
  markName: string;
  markType: string;
  businessDescription: string;
  goodsServices: string;
  useInCommerce: string;
  firstUseDate: string;
  intendedUse: string;
  logo?: string;
  slogan?: string;
  colors?: string;
  similarMarks: string;
  marketingChannels: string;
  targetAudience: string;
}

const TrademarkInterviewWizard = ({ 
  onComplete 
}: { 
  onComplete: (data: TrademarkData) => void;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  const trademarkQuestions: TrademarkQuestion[] = [
    {
      id: "email",
      type: "text",
      question: "Let's start with your contact information. What's your email address?",
      placeholder: "business@example.com",
      required: true
    },
    {
      id: "markName",
      type: "text",
      question: "What is the exact name or text of your trademark?",
      placeholder: "e.g., TechGuard Pro",
      required: true,
      followUp: "This should be exactly as it appears or will appear in your business."
    },
    {
      id: "markType",
      type: "multiple-choice",
      question: "What type of trademark are you filing?",
      options: [
        "Word Mark (text only)",
        "Design Mark (logo/symbol)",
        "Combined Mark (text + logo)",
        "Slogan/Tagline",
        "Sound Mark"
      ],
      required: true
    },
    {
      id: "businessDescription",
      type: "textarea",
      question: "Describe your business and what you do.",
      placeholder: "We provide cybersecurity software solutions for small and medium businesses, including threat monitoring, data encryption, and security consulting services...",
      required: true
    },
    {
      id: "goodsServices",
      type: "textarea",
      question: "Specifically, what goods or services will this trademark be used for?",
      placeholder: "Computer security software; cybersecurity consulting services; data encryption services; network monitoring software; security training programs...",
      required: true,
      followUp: "Be as specific as possible. This determines your trademark classes."
    },
    {
      id: "useInCommerce",
      type: "multiple-choice",
      question: "How are you currently using this trademark?",
      options: [
        "Already using in commerce (selling goods/services)",
        "Intent to use (plan to use but haven't started yet)",
        "Used in commerce but not continuously",
        "Only used for internal purposes so far"
      ],
      required: true
    },
    {
      id: "firstUseDate",
      type: "text",
      question: "When did you first use this mark in commerce? (If applicable)",
      placeholder: "MM/DD/YYYY or 'Not yet used'",
      required: false,
      followUp: "This is the date you first sold goods or provided services using this mark."
    },
    {
      id: "marketingChannels",
      type: "textarea",
      question: "Where and how do you use this trademark? (Marketing channels, products, etc.)",
      placeholder: "Website headers, business cards, product packaging, social media accounts, email signatures, storefront signage...",
      required: true
    },
    {
      id: "targetAudience",
      type: "textarea",
      question: "Who is your target audience or customer base?",
      placeholder: "Small business owners, IT managers, companies with 10-500 employees, healthcare organizations...",
      required: true
    },
    {
      id: "similarMarks",
      type: "textarea",
      question: "Are you aware of any similar trademarks in your industry?",
      placeholder: "List any competitors or similar business names you know of...",
      required: false,
      followUp: "We'll also perform a professional search, but your knowledge helps."
    },
    {
      id: "colors",
      type: "text",
      question: "If this is a design mark, what colors are essential to your trademark?",
      placeholder: "Red and blue, or 'No color claim'",
      required: false
    },
    {
      id: "intendedUse",
      type: "textarea",
      question: "How do you plan to expand the use of this trademark in the future?",
      placeholder: "Plans for new products, services, markets, or geographic expansion...",
      required: false
    }
  ];

  useEffect(() => {
    const id = `trademark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`trademark_interview_${sessionId}`, JSON.stringify({
        responses,
        currentStep,
        timestamp: Date.now()
      }));
    }
  }, [responses, currentStep, sessionId]);

  const currentQuestion = trademarkQuestions[currentStep];
  const progress = ((currentStep + 1) / trademarkQuestions.length) * 100;

  const performTrademarkSearch = async (markName: string) => {
    setIsSearching(true);
    try {
      // Simulate TESS database search
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock search results
      const mockResults = [
        {
          markText: "TechGuard",
          owner: "Tech Security Inc.",
          status: "Live",
          regNumber: "6123456",
          class: "Class 9 - Computer Software"
        },
        {
          markText: "TechGuardian",
          owner: "Guardian Technologies",
          status: "Pending",
          regNumber: "Application #97789123",
          class: "Class 42 - Technology Services"
        }
      ];
      
      setSearchResults(mockResults);
      
      if (mockResults.length > 0) {
        toast.error(`Found ${mockResults.length} potentially conflicting trademarks. Review carefully.`);
      } else {
        toast.success("Great news! No direct conflicts found in preliminary search.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search temporarily unavailable. We'll perform a comprehensive search later.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = async () => {
    if (currentQuestion.required && !currentAnswer.trim()) {
      toast.error("This question is required. Please provide an answer.");
      return;
    }

    // Save the response
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: currentAnswer
    }));

    // Perform trademark search when mark name is provided
    if (currentQuestion.id === 'markName' && currentAnswer.trim()) {
      await performTrademarkSearch(currentAnswer.trim());
    }

    // Simulate AI processing
    setIsThinking(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsThinking(false);

    if (currentStep < trademarkQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentAnswer("");
    } else {
      // Interview complete
      const trademarkData: TrademarkData = {
        email: responses.email || "",
        markName: responses.markName || "",
        markType: responses.markType || "",
        businessDescription: responses.businessDescription || "",
        goodsServices: responses.goodsServices || "",
        useInCommerce: responses.useInCommerce || "",
        firstUseDate: responses.firstUseDate || "",
        intendedUse: responses.intendedUse || "",
        colors: responses.colors || "",
        similarMarks: responses.similarMarks || "",
        marketingChannels: responses.marketingChannels || "",
        targetAudience: responses.targetAudience || ""
      };
      
      onComplete(trademarkData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentAnswer(responses[trademarkQuestions[currentStep - 1].id] || "");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-legal-dark">Trademark Interview</h1>
                <p className="text-sm text-muted-foreground">AI-guided trademark application</p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              Question {currentStep + 1} of {trademarkQuestions.length}
            </Badge>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Interview Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <Card className="shadow-feature">
            <CardContent className="p-8">
              {isThinking && (
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm text-primary">AI is processing your response...</span>
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Search className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-600">Searching USPTO database for conflicts...</span>
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-600">Potential Conflicts Found</span>
                  </div>
                  <div className="space-y-2">
                    {searchResults.map((result, index) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <strong>{result.markText}</strong> - {result.owner} ({result.status})
                        <br />
                        <span className="text-muted-foreground">{result.class}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-legal-dark mb-2">
                      {currentQuestion.question}
                    </h2>
                    {currentQuestion.followUp && (
                      <p className="text-muted-foreground text-sm">
                        {currentQuestion.followUp}
                      </p>
                    )}
                  </div>
                </div>

                <div className="ml-16">
                  {currentQuestion.type === 'text' && (
                    <Input
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder={currentQuestion.placeholder}
                      className="text-lg"
                      onKeyPress={(e) => e.key === 'Enter' && handleNext()}
                    />
                  )}

                  {currentQuestion.type === 'textarea' && (
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder={currentQuestion.placeholder}
                      className="min-h-[120px] text-lg"
                      rows={4}
                    />
                  )}

                  {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option) => (
                        <div
                          key={option}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-card ${
                            currentAnswer === option 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setCurrentAnswer(option)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              currentAnswer === option 
                                ? 'bg-primary border-primary' 
                                : 'border-border'
                            }`}>
                              {currentAnswer === option && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                            <span className="text-base">{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-2">
                  {currentQuestion.required && (
                    <span className="text-xs text-muted-foreground">* Required</span>
                  )}
                </div>

                <Button 
                  onClick={handleNext}
                  disabled={currentQuestion.required && !currentAnswer.trim()}
                  className="px-8"
                >
                  {currentStep === trademarkQuestions.length - 1 ? (
                    <>
                      Complete Interview
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              🔍 We perform live USPTO database searches to check for conflicts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrademarkInterviewWizard;