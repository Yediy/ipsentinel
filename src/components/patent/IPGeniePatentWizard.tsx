import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FileText, Loader, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatentWizardProps {
  filing_id: string;
  onComplete?: () => void;
}

export const IPGeniePatentWizard: React.FC<PatentWizardProps> = ({ 
  filing_id, 
  onComplete 
}) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    abstract: "",
    description: "",
    claims: "",
    features: "",
    prior_art: ""
  });

  const steps = [
    {
      label: "Describe Your Invention",
      field: "description" as keyof typeof form,
      placeholder: "What does your invention do and how does it work? Be as detailed as possible.",
      description: "Start by explaining your invention in simple terms. What problem does it solve?"
    },
    {
      label: "Invention Title",
      field: "title" as keyof typeof form,
      placeholder: "Short, descriptive title for your invention",
      description: "Create a concise title that captures the essence of your invention."
    },
    {
      label: "Abstract Summary",
      field: "abstract" as keyof typeof form,
      placeholder: "1-2 sentence summary of your invention and its main benefit",
      description: "Write a brief summary that explains what your invention is and why it's useful."
    },
    {
      label: "Key Features & Components",
      field: "features" as keyof typeof form,
      placeholder: "List the main technical components, materials, or methods used",
      description: "Describe the key technical features that make your invention work."
    },
    {
      label: "Patent Claims",
      field: "claims" as keyof typeof form,
      placeholder: "What specifically makes your invention unique? (1 claim per line)",
      description: "Write the key claims that define what makes your invention patentable."
    },
    {
      label: "Prior Art & Differences",
      field: "prior_art" as keyof typeof form,
      placeholder: "Describe anything similar that already exists and how yours is different",
      description: "Help us understand the competitive landscape and what makes you unique."
    }
  ];

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const saveSection = async (sectionKey: string, content: string) => {
    try {
      const { error } = await supabase
        .from('filing_sections')
        .upsert({
          filing_id,
          section_key: sectionKey,
          content,
          order_index: step
        }, {
          onConflict: 'filing_id,section_key'
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast.error("Failed to save section");
    }
  };

  const handleNext = async () => {
    const currentStep = steps[step];
    const content = form[currentStep.field];
    
    if (!content.trim()) {
      toast.error("Please fill in this section before continuing");
      return;
    }

    // Save current section
    await saveSection(currentStep.field, content);
    
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  const handleGeneratePatent = async () => {
    setLoading(true);
    try {
      // Save current section first
      const currentStep = steps[step];
      await saveSection(currentStep.field, form[currentStep.field]);

      // Call AI agent to generate patent
      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'generate_patent',
          filing_id,
          sections: form
        }
      });

      if (error) throw error;

      toast.success("Patent draft generated successfully!");
      onComplete?.();
      
    } catch (error: any) {
      console.error('Patent generation error:', error);
      toast.error(error.message || "Failed to generate patent draft");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;
  const currentStep = steps[step];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-primary">IPGenie Patent Wizard</h1>
          <div className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{currentStep.label}</CardTitle>
          <p className="text-muted-foreground">{currentStep.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep.field === 'title' ? (
            <Input
              value={form[currentStep.field]}
              onChange={(e) => handleChange(currentStep.field, e.target.value)}
              placeholder={currentStep.placeholder}
              className="text-lg"
            />
          ) : (
            <Textarea
              value={form[currentStep.field]}
              onChange={(e) => handleChange(currentStep.field, e.target.value)}
              placeholder={currentStep.placeholder}
              className="min-h-[200px] text-base leading-relaxed"
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={handleBack} 
          disabled={step === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          {step < steps.length - 1 ? (
            <Button 
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleGeneratePatent} 
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generate USPTO Patent Draft
            </Button>
          )}
        </div>
      </div>

      {step === steps.length - 1 && (
        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-primary font-medium">
            🎉 Ready to generate your USPTO-compliant patent draft! 
            Our AI will create a professional document with all required sections.
          </p>
        </div>
      )}
    </div>
  );
};