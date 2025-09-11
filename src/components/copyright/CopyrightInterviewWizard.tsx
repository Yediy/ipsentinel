import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Palette, ArrowLeft, ArrowRight, Save, Bot, CheckCircle, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CopyrightQuestion {
  id: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'file-upload' | 'date';
  question: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  followUp?: string;
}

interface CopyrightData {
  email: string;
  workTitle: string;
  workType: string;
  workDescription: string;
  authorName: string;
  creationDate: string;
  publicationDate: string;
  publicationStatus: string;
  copyrightOwner: string;
  workForHire: string;
  previousRegistration: string;
  derivativeWork: string;
  workCategory: string;
  fileUploaded?: boolean;
  fileName?: string;
  registrationPurpose: string;
  commercialUse: string;
}

const CopyrightInterviewWizard = ({ 
  onComplete 
}: { 
  onComplete: (data: CopyrightData) => void;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  const copyrightQuestions: CopyrightQuestion[] = [
    {
      id: "email",
      type: "text",
      question: "Let's start with your contact information. What's your email address?",
      placeholder: "creator@example.com",
      required: true
    },
    {
      id: "workTitle",
      type: "text",
      question: "What is the title of the work you want to copyright?",
      placeholder: "e.g., 'The Digital Marketing Handbook' or 'Sunrise Symphony'",
      required: true
    },
    {
      id: "workType",
      type: "multiple-choice",
      question: "What type of creative work is this?",
      options: [
        "Literary Work (books, articles, poems, etc.)",
        "Musical Work (songs, compositions)",
        "Dramatic Work (plays, scripts)",
        "Visual Arts Work (paintings, photographs, graphics)",
        "Software/Computer Program",
        "Audiovisual Work (videos, films)",
        "Audio Recording",
        "Architectural Work",
        "Other"
      ],
      required: true
    },
    {
      id: "workDescription",
      type: "textarea",
      question: "Describe your work in detail. What is it about?",
      placeholder: "A comprehensive guide to digital marketing strategies for small businesses, covering social media, email marketing, SEO, and analytics...",
      required: true,
      followUp: "This description will appear in your copyright registration."
    },
    {
      id: "authorName",
      type: "text",
      question: "Who is the author/creator of this work?",
      placeholder: "Full legal name of the author",
      required: true,
      followUp: "This is the person who actually created the work."
    },
    {
      id: "copyrightOwner",
      type: "multiple-choice",
      question: "Who owns the copyright to this work?",
      options: [
        "I am the author and owner",
        "I own it but didn't create it (transfer of ownership)",
        "My company/organization owns it",
        "Joint ownership",
        "Other arrangement"
      ],
      required: true
    },
    {
      id: "workForHire",
      type: "multiple-choice",
      question: "Is this a 'work made for hire'?",
      options: [
        "No, I created this independently",
        "Yes, I created this as an employee",
        "Yes, this was commissioned work under contract",
        "Not sure"
      ],
      required: true,
      followUp: "Work for hire affects who owns the copyright."
    },
    {
      id: "creationDate",
      type: "text",
      question: "When was this work created or completed?",
      placeholder: "MM/DD/YYYY or approximate date",
      required: true,
      followUp: "This is when you finished creating the work, not when you started."
    },
    {
      id: "publicationStatus",
      type: "multiple-choice",
      question: "Has this work been published?",
      options: [
        "No, it's unpublished",
        "Yes, it has been published",
        "It will be published soon",
        "Not sure what counts as publication"
      ],
      required: true
    },
    {
      id: "publicationDate",
      type: "text",
      question: "If published, when was it first published?",
      placeholder: "MM/DD/YYYY or 'Not published'",
      required: false,
      followUp: "Publication means distribution to the public, including online."
    },
    {
      id: "derivativeWork",
      type: "multiple-choice",
      question: "Is this work based on or derived from another existing work?",
      options: [
        "No, this is completely original",
        "Yes, it's based on my own previous work",
        "Yes, it incorporates public domain material",
        "Yes, it's based on someone else's work (with permission)",
        "Not sure"
      ],
      required: true
    },
    {
      id: "previousRegistration",
      type: "multiple-choice",
      question: "Have you previously registered copyright for this work or a version of it?",
      options: [
        "No, this is the first registration",
        "Yes, I've registered a previous version",
        "Not sure",
        "Someone else may have registered it"
      ],
      required: true
    },
    {
      id: "registrationPurpose",
      type: "textarea",
      question: "Why are you registering this copyright? What do you plan to do with it?",
      placeholder: "I plan to publish and sell this work, license it to others, and want legal protection against infringement...",
      required: false,
      followUp: "This helps us understand your needs and provide better guidance."
    },
    {
      id: "commercialUse",
      type: "multiple-choice",
      question: "Do you plan to use this work commercially?",
      options: [
        "Yes, I plan to sell or license it",
        "No, it's for personal or educational use",
        "Maybe in the future",
        "It's for non-profit purposes"
      ],
      required: true
    }
  ];

  useEffect(() => {
    const id = `copyright_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`copyright_interview_${sessionId}`, JSON.stringify({
        responses,
        currentStep,
        timestamp: Date.now()
      }));
    }
  }, [responses, currentStep, sessionId]);

  const currentQuestion = copyrightQuestions[currentStep];
  const progress = ((currentStep + 1) / copyrightQuestions.length) * 100;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setCurrentAnswer(`File uploaded: ${file.name}`);
      toast.success("File uploaded successfully!");
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

    // Simulate AI processing
    setIsThinking(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsThinking(false);

    if (currentStep < copyrightQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentAnswer("");
    } else {
      // Interview complete
      const copyrightData: CopyrightData = {
        email: responses.email || "",
        workTitle: responses.workTitle || "",
        workType: responses.workType || "",
        workDescription: responses.workDescription || "",
        authorName: responses.authorName || "",
        creationDate: responses.creationDate || "",
        publicationDate: responses.publicationDate || "",
        publicationStatus: responses.publicationStatus || "",
        copyrightOwner: responses.copyrightOwner || "",
        workForHire: responses.workForHire || "",
        previousRegistration: responses.previousRegistration || "",
        derivativeWork: responses.derivativeWork || "",
        workCategory: responses.workType || "",
        fileUploaded: !!uploadedFile,
        fileName: uploadedFile?.name,
        registrationPurpose: responses.registrationPurpose || "",
        commercialUse: responses.commercialUse || ""
      };
      
      onComplete(copyrightData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentAnswer(responses[copyrightQuestions[currentStep - 1].id] || "");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-2">
              <Palette className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-legal-dark">Copyright Interview</h1>
                <p className="text-sm text-muted-foreground">AI-guided copyright registration</p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              Question {currentStep + 1} of {copyrightQuestions.length}
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

                  {currentQuestion.type === 'file-upload' && (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.png,.mp3,.mp4,.zip"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                        <p className="text-lg font-semibold">Upload Your Work</p>
                        <p className="text-muted-foreground">
                          Drag and drop or click to select file
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Supported: PDF, DOC, TXT, JPG, PNG, MP3, MP4, ZIP
                        </p>
                      </label>
                      
                      {uploadedFile && (
                        <div className="mt-4 p-3 bg-success/10 rounded-lg">
                          <div className="flex items-center justify-center space-x-2">
                            <FileText className="h-5 w-5 text-success" />
                            <span className="text-success font-medium">{uploadedFile.name}</span>
                          </div>
                        </div>
                      )}
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
                  {currentStep === copyrightQuestions.length - 1 ? (
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
              📝 Upload your work file for the most accurate copyright registration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyrightInterviewWizard;