import React, { useState } from 'react';
import { IPGenieWelcome } from './IPGenieWelcome';
import { IPGeniePatentWizard } from './IPGeniePatentWizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface PatentFilingDashboardProps {
  onBack?: () => void;
}

export const PatentFilingDashboard: React.FC<PatentFilingDashboardProps> = ({ 
  onBack 
}) => {
  const [currentView, setCurrentView] = useState<'welcome' | 'wizard'>('welcome');
  const [currentFilingId, setCurrentFilingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStartPatentFiling = async () => {
    try {
      // Create a new patent filing
      const { data: filing, error } = await supabase
        .from('filings')
        .insert({
          type: 'patent',
          country: 'US',
          title: 'New Patent Application',
          status: 'draft',
          contact_email: 'user@example.com' // In production, get from auth
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentFilingId(filing.id);
      setCurrentView('wizard');
      
      toast({
        title: "Patent Filing Started",
        description: "Your new patent application has been created. Let's begin the AI interview process."
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start patent filing process",
        variant: "destructive"
      });
    }
  };

  const handleWizardComplete = () => {
    toast({
      title: "Patent Application Complete!",
      description: "Your patent application has been successfully generated and is ready for review."
    });
    
    // Could redirect to filing dashboard or show success state
    setCurrentView('welcome');
    setCurrentFilingId(null);
  };

  const handleBackToWelcome = () => {
    setCurrentView('welcome');
    setCurrentFilingId(null);
  };

  if (currentView === 'wizard' && currentFilingId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToWelcome}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Welcome
                </Button>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold">Patent Application Wizard</h1>
                  <p className="text-sm text-muted-foreground">
                    AI-guided patent filing process
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                USPTO Compliant
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="py-8">
          <IPGeniePatentWizard 
            filing_id={currentFilingId}
            onComplete={handleWizardComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {onBack && (
        <div className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
      
      <div className="py-8">
        <IPGenieWelcome onStartPatentFiling={handleStartPatentFiling} />
      </div>
    </div>
  );
};