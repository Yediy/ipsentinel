import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowLeft, ArrowRight, Save, Bot, User, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InterviewQuestion {
  id: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'yes-no';
  question: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  followUp?: string;
}

interface PatentData {
  email: string;
  inventionTitle: string;
  problemDescription: string;
  solutionDescription: string;
  uniqueFeatures: string;
  useCases: string;
  components: string;
  howItWorks: string;
  priorArt: string;
  inventors: string;
  commercialUse: string;
}

const PatentInterviewWizard = ({ onComplete }: { onComplete: (data: PatentData) => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  const interviewQuestions: InterviewQuestion[] = [
    {
      id: "email",
      type: "text",
      question: "Let's start with your contact information. What's your email address?",
      placeholder: "inventor@example.com",
      required: true
    },
    {
      id: "inventionTitle",
      type: "text", 
      question: "What would you call your invention? Give it a descriptive title.",
      placeholder: "e.g., Smart Home Security Monitoring System",
      required: true
    },
    {
      id: "problemDescription",
      type: "textarea",
      question: "What problem does your invention solve? Describe the current pain points or limitations that exist.",
      placeholder: "Current home security systems are limited because they only detect intrusion after it happens, and homeowners can't easily monitor multiple properties remotely...",
      required: true
    },
    {
      id: "solutionDescription", 
      type: "textarea",
      question: "How does your invention solve this problem? Describe your solution in simple terms.",
      placeholder: "My invention uses AI-powered cameras with predictive analytics to detect suspicious behavior before break-ins occur, and provides a unified dashboard for monitoring multiple properties...",
      required: true
    },
    {
      id: "uniqueFeatures",
      type: "textarea", 
      question: "What makes your invention unique? What sets it apart from existing solutions?",
      placeholder: "Unlike existing systems, mine combines predictive AI, real-time threat assessment, and multi-property management in a single platform...",
      required: true
    },
    {
      id: "howItWorks",
      type: "textarea",
      question: "Can you walk me through how your invention works? Describe the key steps or process.",
      placeholder: "First, the AI cameras analyze normal behavior patterns. Then, when unusual activity is detected, the system evaluates threat level. If a potential threat is identified...",
      required: true
    },
    {
      id: "components",
      type: "textarea", 
      question: "What are the main components or parts of your invention? List the key hardware and software elements.",
      placeholder: "AI-powered cameras, central processing unit, mobile app, cloud analytics platform, motion sensors, notification system...",
      required: true
    },
    {
      id: "useCases",
      type: "textarea",
      question: "Can you describe 2-3 specific use cases or scenarios where your invention would be valuable?",
      placeholder: "1. Homeowners with multiple vacation properties 2. Small business owners monitoring storefronts 3. Property managers overseeing rental units...",
      required: true
    },
    {
      id: "priorArt",
      type: "textarea",
      question: "Are you aware of any similar inventions or existing solutions? How is yours different?",
      placeholder: "Ring cameras exist but only record after motion is detected. Nest has AI but doesn't predict threats. My invention combines both predictive analytics and multi-property management...",
      required: false
    },
    {
      id: "inventors",
      type: "text",
      question: "Who are the inventors? Please list all people who contributed to creating this invention.",
      placeholder: "John Smith, Jane Doe",
      required: true
    },
    {
      id: "commercialUse",
      type: "yes-no",
      question: "Do you plan to commercialize this invention or license it to others?",
      options: ["Yes, I plan to commercialize it", "No, it's for personal use only", "I'm not sure yet"],
      required: true
    }
  ];

  // Generate session ID on mount
  useEffect(() => {
    const id = `patent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  // Auto-save responses
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`patent_interview_${sessionId}`, JSON.stringify({
        responses,
        currentStep,
        timestamp: Date.now()
      }));
    }
  }, [responses, currentStep, sessionId]);

  const currentQuestion = interviewQuestions[currentStep];
  const progress = ((currentStep + 1) / interviewQuestions.length) * 100;

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

    // Simulate AI processing
    setIsThinking(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsThinking(false);

    if (currentStep < interviewQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentAnswer("");
    } else {
      // Interview complete - compile data
      const patentData: PatentData = {
        email: responses.email || "",
        inventionTitle: responses.inventionTitle || "",
        problemDescription: responses.problemDescription || "",
        solutionDescription: responses.solutionDescription || "",
        uniqueFeatures: responses.uniqueFeatures || "",
        useCases: responses.useCases || "",
        components: responses.components || "",
        howItWorks: responses.howItWorks || "",
        priorArt: responses.priorArt || "",
        inventors: responses.inventors || "",
        commercialUse: responses.commercialUse || ""
      };
      
      onComplete(patentData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentAnswer(responses[interviewQuestions[currentStep - 1].id] || "");
    }
  };

  const saveAndExit = () => {
    localStorage.setItem(`patent_interview_${sessionId}`, JSON.stringify({
      responses,
      currentStep,
      timestamp: Date.now()
    }));
    toast.success("Progress saved! You can resume this interview later.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-legal-dark">Patent Interview</h1>
                <p className="text-sm text-muted-foreground">AI-guided utility patent application</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={saveAndExit} className="text-muted-foreground">
                <Save className="h-4 w-4 mr-2" />
                Save & Exit
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                Question {currentStep + 1} of {interviewQuestions.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Interview Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Interview Card */}
          <Card className="shadow-feature">
            <CardContent className="p-8">
              {/* AI Thinking Indicator */}
              {isThinking && (
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm text-primary">AI is processing your response...</span>
                  </div>
                </div>
              )}

              {/* Question */}
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

                {/* Answer Input */}
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

                  {currentQuestion.type === 'yes-no' && currentQuestion.options && (
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

              {/* Previous Responses Summary */}
              {Object.keys(responses).length > 0 && (
                <div className="mb-8 p-4 bg-muted/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Previous Responses:</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(responses).slice(-2).map(([key, value]) => {
                      const question = interviewQuestions.find(q => q.id === key);
                      return (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{question?.question.split('?')[0]}:</span>{' '}
                          <span className="text-muted-foreground">
                            {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation */}
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
                  {currentStep === interviewQuestions.length - 1 ? (
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

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Be as detailed as possible. The more information you provide, 
              the better our AI can draft your patent application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentInterviewWizard;