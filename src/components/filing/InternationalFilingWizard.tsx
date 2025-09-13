import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Globe, FileText, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InternationalFilingWizardProps {
  onComplete?: (filingId: string) => void;
  onBack?: () => void;
}

interface FilingData {
  type: 'patent' | 'trademark' | 'copyright';
  route: 'national' | 'pct' | 'paris' | 'madrid';
  country: string;
  language: string;
  title: string;
  priority_date: string;
  agent_required: boolean;
  agent_contact: string;
  cn_type?: 'invention' | 'utility_model' | 'design';
}

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'EP', name: 'European Union', flag: '🇪🇺' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

const ROUTE_INFO = {
  national: {
    title: "National Filing",
    description: "File directly in one country/jurisdiction",
    icon: "🏛️",
    timeframe: "Immediate filing required"
  },
  pct: {
    title: "PCT (International)",
    description: "Patent Cooperation Treaty - international patent application",
    icon: "🌍",
    timeframe: "30 months to enter national phase"
  },
  paris: {
    title: "Paris Convention",
    description: "Claim priority from earlier filing within 12 months",
    icon: "📋",
    timeframe: "12 months from priority date"
  },
  madrid: {
    title: "Madrid System",
    description: "International trademark registration system",
    icon: "®️",
    timeframe: "Based on home registration/application"
  }
};

export const InternationalFilingWizard: React.FC<InternationalFilingWizardProps> = ({ 
  onComplete, 
  onBack 
}) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FilingData>({
    type: 'patent',
    route: 'national',
    country: 'US',
    language: 'en',
    title: '',
    priority_date: new Date().toISOString().split('T')[0],
    agent_required: false,
    agent_contact: '',
    cn_type: 'invention'
  });

  const steps = [
    {
      title: "IP Type & Route",
      description: "Select intellectual property type and filing route",
      icon: FileText
    },
    {
      title: "Jurisdiction & Language",
      description: "Choose target country and language requirements",
      icon: Globe
    },
    {
      title: "Priority & Timing",
      description: "Set priority dates and deadlines",
      icon: Calendar
    },
    {
      title: "Agent & Contact",
      description: "Configure agent requirements and contacts",
      icon: Users
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    } else {
      onBack?.();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create the filing record
      const { data: filing, error: filingError } = await supabase
        .from('filings')
        .insert({
          type: formData.type,
          country: formData.country,
          title: formData.title || `New ${formData.type} Filing`,
          status: 'draft'
        })
        .select()
        .single();

      if (filingError) throw filingError;

      // Create automatic deadlines based on route and country
      const deadlines = calculateDeadlines(formData);
      if (deadlines.length > 0) {
        await supabase
          .from('deadlines')
          .insert(deadlines.map(d => ({
            filing_id: filing.id,
            ...d
          })));
      }

      toast.success("International filing created successfully!");
      onComplete?.(filing.id);
    } catch (error: any) {
      console.error('Filing creation error:', error);
      toast.error(error.message || "Failed to create filing");
    } finally {
      setLoading(false);
    }
  };

  const calculateDeadlines = (data: FilingData) => {
    const deadlines = [];
    const priority = new Date(data.priority_date);

    if (data.route === 'pct') {
      // PCT national phase deadline (30 months for most countries, varies)
      const pctMonths = data.country === 'EP' ? 31 : 30;
      const pctDate = new Date(priority);
      pctDate.setMonth(pctDate.getMonth() + pctMonths);
      
      deadlines.push({
        label: `PCT ${data.country} National Phase`,
        due_on: pctDate.toISOString().split('T')[0]
      });
    }

    if (data.route === 'paris') {
      // Paris Convention 12-month deadline
      const parisDate = new Date(priority);
      parisDate.setMonth(parisDate.getMonth() + 12);
      
      deadlines.push({
        label: `Paris Convention Filing Deadline`,
        due_on: parisDate.toISOString().split('T')[0]
      });
    }

    return deadlines;
  };

  const updateFormData = (field: keyof FilingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const progress = ((step + 1) / steps.length) * 100;
  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            International IP Filing
          </h1>
          <div className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Step */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepIcon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">{currentStep.title}</CardTitle>
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 0 && (
            <div className="space-y-6">
              {/* IP Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Intellectual Property Type</Label>
                <div className="grid grid-cols-3 gap-4">
                  {(['patent', 'trademark', 'copyright'] as const).map((type) => (
                    <div
                      key={type}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.type === type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => updateFormData('type', type)}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">
                          {type === 'patent' ? '⚗️' : type === 'trademark' ? '®️' : '©️'}
                        </div>
                        <div className="font-medium capitalize">{type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Filing Route</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(ROUTE_INFO).map(([route, info]) => {
                    const isDisabled = 
                      (route === 'madrid' && formData.type !== 'trademark') ||
                      (route === 'pct' && formData.type !== 'patent');
                    
                    return (
                      <div
                        key={route}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isDisabled 
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : formData.route === route
                              ? 'border-primary bg-primary/5 cursor-pointer'
                              : 'border-border hover:border-primary/50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && updateFormData('route', route)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-xl">{info.icon}</div>
                          <div>
                            <div className="font-medium">{info.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {info.description}
                            </div>
                            <div className="text-xs text-primary mt-2">
                              {info.timeframe}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CN Type for Patents in China */}
              {formData.type === 'patent' && formData.country === 'CN' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">China Patent Type</Label>
                  <Select 
                    value={formData.cn_type} 
                    onValueChange={(value) => updateFormData('cn_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invention">Invention Patent (发明专利)</SelectItem>
                      <SelectItem value="utility_model">Utility Model (实用新型)</SelectItem>
                      <SelectItem value="design">Design Patent (外观设计)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {/* Country Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Target Jurisdiction</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => updateFormData('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                          <span className="text-muted-foreground">({country.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Application Language</Label>
                <Select 
                  value={formData.language} 
                  onValueChange={(value) => updateFormData('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-medium">Filing Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Enter a descriptive title for this filing"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Priority Date */}
              <div className="space-y-3">
                <Label htmlFor="priority_date" className="text-base font-medium">Priority Date</Label>
                <Input
                  id="priority_date"
                  type="date"
                  value={formData.priority_date}
                  onChange={(e) => updateFormData('priority_date', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  For new filings, use today's date. For convention filings, use the original priority date.
                </p>
              </div>

              {/* Route-specific info */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-medium mb-2">
                  {ROUTE_INFO[formData.route].title} - Key Information
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {ROUTE_INFO[formData.route].description}
                </p>
                
                {formData.route === 'pct' && (
                  <div className="text-sm">
                    <p>• PCT application provides 30 months to enter national phase</p>
                    <p>• Unified examination procedure</p>
                    <p>• Single application for multiple countries</p>
                  </div>
                )}
                
                {formData.route === 'paris' && (
                  <div className="text-sm">
                    <p>• 12-month priority period from first filing</p>
                    <p>• Direct national filing in each country</p>
                    <p>• Claim priority from earlier application</p>
                  </div>
                )}
                
                {formData.route === 'madrid' && (
                  <div className="text-sm">
                    <p>• Based on home application or registration</p>
                    <p>• Designate multiple countries in one application</p>
                    <p>• Centralized management through WIPO</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Agent Required */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agent_required"
                    checked={formData.agent_required}
                    onCheckedChange={(checked) => updateFormData('agent_required', checked)}
                  />
                  <Label htmlFor="agent_required" className="text-base font-medium">
                    Local agent required
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.country === 'CN' 
                    ? "Foreign applicants must use a China-qualified agent"
                    : "Check if local representation is required in your target jurisdiction"
                  }
                </p>
              </div>

              {/* Agent Contact */}
              {formData.agent_required && (
                <div className="space-y-3">
                  <Label htmlFor="agent_contact" className="text-base font-medium">Agent Contact</Label>
                  <Input
                    id="agent_contact"
                    value={formData.agent_contact}
                    onChange={(e) => updateFormData('agent_contact', e.target.value)}
                    placeholder="Enter agent contact information"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-secondary rounded-lg">
                <h3 className="font-medium mb-3">Filing Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="capitalize">{formData.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Route:</span>
                    <span className="capitalize">{formData.route}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jurisdiction:</span>
                    <span>{COUNTRIES.find(c => c.code === formData.country)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Language:</span>
                    <span>{formData.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority Date:</span>
                    <span>{formData.priority_date}</span>
                  </div>
                  {formData.agent_required && (
                    <div className="flex justify-between">
                      <span>Agent:</span>
                      <span>Required</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button 
          onClick={handleNext}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {step === steps.length - 1 ? 'Create Filing' : 'Next'}
          {step < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};