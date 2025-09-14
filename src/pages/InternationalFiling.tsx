import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InternationalFilingWizard } from "@/components/filing/InternationalFilingWizard";
import { ArrowLeft, Globe, FileText, Calendar, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const InternationalFiling = () => {
  const [showWizard, setShowWizard] = useState(false);
  const navigate = useNavigate();

  const handleStartFiling = () => {
    setShowWizard(true);
  };

  const handleWizardComplete = (filingId: string) => {
    // Navigate to filing dashboard or details page
    navigate(`/filings`);
  };

  const handleBack = () => {
    if (showWizard) {
      setShowWizard(false);
    } else {
      navigate('/dashboard');
    }
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Options
            </Button>
          </div>
        </div>
        
        <InternationalFilingWizard 
          onComplete={handleWizardComplete}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Globe className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                International IP Filing
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              File patents, trademarks, and copyrights worldwide with AI-powered assistance.
              Navigate complex international IP laws with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="shadow-card hover:shadow-feature transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Multi-Route Filing</CardTitle>
                <CardDescription>
                  Choose between national, PCT, Paris Convention, or Madrid Protocol routes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-feature transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Deadline Management</CardTitle>
                <CardDescription>
                  Automatic calculation of priority and national phase deadlines
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card hover:shadow-feature transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Agent Coordination</CardTitle>
                <CardDescription>
                  Connect with local agents and manage international requirements
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="shadow-feature border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl mb-4">Start Your International Filing</CardTitle>
                <CardDescription className="text-lg">
                  Our AI wizard will guide you through the process step by step
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="flex flex-col items-center">
                    <Badge variant="outline" className="bg-primary/10 text-primary mb-2">
                      Patents
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Invention • Utility Model • Design
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <Badge variant="outline" className="bg-primary/10 text-primary mb-2">
                      Trademarks
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      National • Madrid Protocol
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <Badge variant="outline" className="bg-primary/10 text-primary mb-2">
                      Copyrights
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Works • Software • Creative
                    </p>
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={handleStartFiling}
                  className="text-lg px-8 py-4"
                >
                  Start International Filing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternationalFiling;