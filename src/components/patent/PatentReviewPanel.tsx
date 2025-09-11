import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Edit, Download, ArrowRight, Bot, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface GeneratedContent {
  abstract: string;
  background: string;
  summary: string;
  detailed_description: string;
  claims: string[];
  drawings_description?: string;
}

const PatentReviewPanel = ({ 
  patentData, 
  onProceedToPayment 
}: { 
  patentData: PatentData;
  onProceedToPayment: (data: PatentData, content: GeneratedContent) => void;
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeSection, setActiveSection] = useState("abstract");
  const [editedContent, setEditedContent] = useState<Partial<GeneratedContent>>({});

  useEffect(() => {
    generatePatentContent();
  }, []);

  const generatePatentContent = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI generation - in production, this would call the OpenAI API
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockContent: GeneratedContent = {
        abstract: `The present invention relates to ${patentData.inventionTitle.toLowerCase()}, a novel system designed to address ${patentData.problemDescription.split('.')[0].toLowerCase()}. The invention comprises ${patentData.components.split(',')[0].toLowerCase()} and related components that work together to provide an improved solution for ${patentData.solutionDescription.split('.')[0].toLowerCase()}. The system offers significant advantages over prior art by incorporating ${patentData.uniqueFeatures.split('.')[0].toLowerCase()}, resulting in enhanced performance and user experience.`,
        
        background: `Field of the Invention\n\nThe present invention relates generally to ${patentData.inventionTitle.toLowerCase()}, and more specifically to systems and methods for ${patentData.problemDescription.split('.')[0].toLowerCase()}.\n\nDescription of Related Art\n\n${patentData.problemDescription}\n\nExisting solutions in this field have several limitations. ${patentData.priorArt || 'Current approaches fail to adequately address the underlying issues, particularly in terms of efficiency, cost-effectiveness, and user experience.'}\n\nTherefore, there exists a need for an improved system that can overcome these limitations and provide a more effective solution.`,
        
        summary: `Summary of the Invention\n\nThe present invention provides ${patentData.solutionDescription}\n\nIn accordance with one aspect of the invention, there is provided a system comprising:\n\n${patentData.components.split(',').map((comp, i) => `${i + 1}. ${comp.trim()}`).join('\n')}\n\nThe invention offers several advantages over the prior art:\n\n${patentData.uniqueFeatures}\n\nThese and other aspects and advantages of the invention will be apparent from the following detailed description and the accompanying drawings.`,
        
        detailed_description: `Detailed Description of the Invention\n\nThe following detailed description references the accompanying drawings that illustrate specific embodiments of the invention.\n\nSystem Overview\n\n${patentData.howItWorks}\n\nOperation\n\nThe system operates as follows:\n\n${patentData.useCases}\n\nThe invention provides significant improvements over existing solutions by incorporating ${patentData.uniqueFeatures}.\n\nImplementation Details\n\nThe system can be implemented using various configurations and components as described in ${patentData.components}.\n\nThe invention is particularly useful for ${patentData.commercialUse.includes('commercialize') ? 'commercial applications' : 'various applications'} and can be adapted for different use cases while maintaining its core functionality.`,
        
        claims: [
          `A ${patentData.inventionTitle.toLowerCase()} system comprising:\na plurality of ${patentData.components.split(',')[0].trim().toLowerCase()};\na processing unit configured to ${patentData.solutionDescription.split('.')[0].toLowerCase()};\nwherein said system provides ${patentData.uniqueFeatures.split('.')[0].toLowerCase()}.`,
          
          `The system of claim 1, wherein the processing unit is further configured to ${patentData.howItWorks.split('.')[0].toLowerCase()}.`,
          
          `The system of claim 1, wherein the system is adapted for use in ${patentData.useCases.split('.')[0].toLowerCase()}.`,
          
          `A method of implementing the system of claim 1, comprising the steps of:\ninitializing the ${patentData.components.split(',')[0].trim().toLowerCase()};\nprocessing data to ${patentData.solutionDescription.split('.')[0].toLowerCase()};\noutputting results based on said processing.`,
          
          `The method of claim 4, further comprising monitoring and optimizing system performance based on ${patentData.uniqueFeatures.split('.')[0].toLowerCase()}.`
        ],
        
        drawings_description: patentData.components.includes('hardware') || patentData.components.includes('device') 
          ? `Brief Description of the Drawings\n\nFIG. 1 shows a block diagram of the overall system architecture.\nFIG. 2 illustrates the main components and their interconnections.\nFIG. 3 depicts the operational flow of the system.\nFIG. 4 shows a detailed view of the primary processing unit.`
          : undefined
      };

      setGeneratedContent(mockContent);
      setEditedContent(mockContent);
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate patent content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSectionEdit = (section: keyof GeneratedContent, content: string) => {
    if (section === 'claims') {
      // Handle claims as array
      const claimsArray = content.split('\n\n').filter(claim => claim.trim());
      setEditedContent(prev => ({ ...prev, [section]: claimsArray }));
    } else {
      setEditedContent(prev => ({ ...prev, [section]: content }));
    }
  };

  const handleProceedToPayment = () => {
    if (!generatedContent) return;
    
    const finalContent = { ...generatedContent, ...editedContent };
    onProceedToPayment(patentData, finalContent);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="shadow-feature max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Bot className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-legal-dark mb-4">
              Generating Your Patent
            </h2>
            <p className="text-muted-foreground mb-6">
              Our AI is analyzing your invention and creating a comprehensive patent application...
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Abstract & Summary</span>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">Background Research</span>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded opacity-50">
                <span className="text-sm">Claims Generation</span>
                <div className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded opacity-50">
                <span className="text-sm">Detailed Description</span>
                <div className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!generatedContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="shadow-feature max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-legal-dark mb-4">
              Generation Failed
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't generate your patent content. Please try again.
            </p>
            <Button onClick={generatePatentContent}>
              Retry Generation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-legal-dark">Patent Review</h1>
                <p className="text-sm text-muted-foreground">Review and edit your AI-generated patent application</p>
              </div>
            </div>
            <Badge className="bg-success/10 text-success border-success">
              <CheckCircle className="h-4 w-4 mr-1" />
              Generation Complete
            </Badge>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title Section */}
          <Card className="shadow-feature mb-8">
            <CardHeader>
              <CardTitle className="text-center text-legal-dark">
                {patentData.inventionTitle}
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Utility Patent Application
              </p>
            </CardHeader>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="abstract">Abstract</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
            </TabsList>

            <TabsContent value="abstract">
              <Card className="shadow-feature">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    Abstract
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedContent.abstract || generatedContent.abstract}
                    onChange={(e) => handleSectionEdit('abstract', e.target.value)}
                    className="min-h-[200px] text-base leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    The abstract should be 50-150 words and provide a concise summary of your invention.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="background">
              <Card className="shadow-feature">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    Background of the Invention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedContent.background || generatedContent.background}
                    onChange={(e) => handleSectionEdit('background', e.target.value)}
                    className="min-h-[400px] text-base leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This section describes the field of invention and prior art limitations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary">
              <Card className="shadow-feature">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    Summary of the Invention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedContent.summary || generatedContent.summary}
                    onChange={(e) => handleSectionEdit('summary', e.target.value)}
                    className="min-h-[400px] text-base leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This section provides a brief overview of your invention and its advantages.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="description">
              <Card className="shadow-feature">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    Detailed Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedContent.detailed_description || generatedContent.detailed_description}
                    onChange={(e) => handleSectionEdit('detailed_description', e.target.value)}
                    className="min-h-[500px] text-base leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This section provides comprehensive details on how your invention works.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="claims">
              <Card className="shadow-feature">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2" />
                    Patent Claims
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(editedContent.claims || generatedContent.claims)?.map((claim, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            Claim {index + 1} {index === 0 ? "(Independent)" : "(Dependent)"}
                          </Badge>
                        </div>
                        <Textarea
                          value={claim}
                          onChange={(e) => {
                            const newClaims = [...(editedContent.claims || generatedContent.claims)];
                            newClaims[index] = e.target.value;
                            setEditedContent(prev => ({ ...prev, claims: newClaims }));
                          }}
                          className="min-h-[100px] text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Claims define the scope of your patent protection. The first claim is typically independent, 
                    while subsequent claims depend on earlier claims.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8">
            <div className="flex space-x-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Draft
              </Button>
            </div>
            
            <Button onClick={handleProceedToPayment} size="lg" className="px-8">
              Proceed to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentReviewPanel;