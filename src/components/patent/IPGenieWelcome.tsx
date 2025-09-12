import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  Sparkles, 
  Brain,
  ArrowRight,
  Shield,
  Zap,
  Award
} from "lucide-react";

interface IPGenieWelcomeProps {
  onStartPatentFiling: () => void;
}

export const IPGenieWelcome: React.FC<IPGenieWelcomeProps> = ({ 
  onStartPatentFiling 
}) => {
  const benefits = [
    {
      icon: <Bot className="h-5 w-5 text-primary" />,
      title: "AI-Guided Interview",
      description: "Smart conversational flow extracts all necessary invention details"
    },
    {
      icon: <FileText className="h-5 w-5 text-primary" />,
      title: "USPTO-Compliant Documents",
      description: "Professional patent applications meeting all USPTO requirements"
    },
    {
      icon: <Zap className="h-5 w-5 text-primary" />,
      title: "10x Faster Process",
      description: "Complete patent applications in hours, not weeks"
    },
    {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: "Legal Template Engine",
      description: "Advanced AI using proven legal templates and precedents"
    }
  ];

  const pricingComparison = [
    {
      method: "Traditional Attorney",
      cost: "$5,000 - $15,000",
      time: "3-6 months",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />
    },
    {
      method: "IPGenie AI",
      cost: "$299 - $799",
      time: "2-4 hours",
      icon: <Sparkles className="h-4 w-4 text-primary" />
    }
  ];

  const patentTypes = [
    {
      type: "Utility Patent",
      description: "For new inventions, processes, machines, or compositions",
      recommended: true
    },
    {
      type: "Provisional Patent",
      description: "Temporary protection while developing your invention",
      recommended: false
    },
    {
      type: "Design Patent",
      description: "For ornamental designs of functional items",
      recommended: false
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary/10 rounded-full p-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Patent Filing Automation
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform your invention into a professional USPTO-compliant patent application 
          using advanced AI legal templates and expert guidance.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((benefit, index) => (
          <Card key={index} className="text-center">
            <CardHeader className="pb-3">
              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                {benefit.icon}
              </div>
              <CardTitle className="text-lg">{benefit.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Cost & Time Comparison
          </CardTitle>
          <CardDescription>
            See how IPGenie compares to traditional patent filing methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pricingComparison.map((option, index) => (
              <div key={index} className={`p-4 rounded-lg border ${option.method === 'IPGenie AI' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {option.icon}
                  <h3 className="font-semibold">{option.method}</h3>
                  {option.method === 'IPGenie AI' && (
                    <Badge variant="default" className="ml-auto">Recommended</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cost:</span>
                    <span className="font-medium">{option.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time:</span>
                    <span className="font-medium">{option.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Patent Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Patent Types Available
          </CardTitle>
          <CardDescription>
            Choose the right patent type for your invention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patentTypes.map((patent, index) => (
              <div key={index} className={`p-4 rounded-lg border ${patent.recommended ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{patent.type}</h3>
                      {patent.recommended && (
                        <Badge variant="default">Most Popular</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {patent.description}
                    </p>
                  </div>
                  {patent.recommended && (
                    <Award className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            How IPGenie Works
          </CardTitle>
          <CardDescription>
            Our 4-step process transforms your invention into a patent application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "AI Interview", desc: "Answer guided questions about your invention" },
              { step: 2, title: "AI Generation", desc: "Advanced LLM creates patent sections" },
              { step: 3, title: "Review & Edit", desc: "Review and customize the generated content" },
              { step: 4, title: "USPTO Filing", desc: "Download or submit directly to USPTO" }
            ].map((phase, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto font-bold">
                  {phase.step}
                </div>
                <h3 className="font-semibold">{phase.title}</h3>
                <p className="text-sm text-muted-foreground">{phase.desc}</p>
                {index < 3 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <div className="text-center space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Ready to File Your Patent?</h2>
          <p className="text-muted-foreground mb-6">
            Start your AI-guided patent application process today and protect your invention with professional USPTO-compliant documentation.
          </p>
          <Button 
            size="lg" 
            onClick={onStartPatentFiling}
            className="bg-primary hover:bg-primary/90"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Start Patent Filing
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
        
        <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>USPTO Compliant</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>Secure & Confidential</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4 text-purple-500" />
            <span>Expert Legal Templates</span>
          </div>
        </div>
      </div>
    </div>
  );
};