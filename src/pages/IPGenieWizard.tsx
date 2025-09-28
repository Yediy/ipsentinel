import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FileIcon, GlobeIcon, ShieldIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormData {
  // Metadata
  type: string;
  route: string;
  country_code: string;
  priority_date: string;
  
  // Patent fields
  title: string;
  abstract: string;
  detailed_description: string;
  claims: string;
  features: string;
  prior_art: string;
  problem: string;
  solution: string;
  
  // Trademark fields
  tm_mark_text: string;
  tm_mark_type: string;
  tm_classes: number[];
  
  // Copyright fields
  work_title: string;
  work_type: string;
  authorship_description: string;
  
  // China specific
  cn_type: string;
}

const IPGenieWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    type: '',
    route: 'national',
    country_code: 'US',
    priority_date: '',
    title: '',
    abstract: '',
    detailed_description: '',
    claims: '',
    features: '',
    prior_art: '',
    problem: '',
    solution: '',
    tm_mark_text: '',
    tm_mark_type: 'word',
    tm_classes: [],
    work_title: '',
    work_type: '',
    authorship_description: '',
    cn_type: 'invention'
  });
  
  const navigate = useNavigate();

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const filingData = {
        user_id: user.user?.id,
        type: formData.type,
        route: formData.route as 'national' | 'pct' | 'paris' | 'madrid',
        country: formData.country_code, // Map country_code to country for compatibility
        country_code: formData.country_code,
        priority_date: formData.priority_date || null,
        title: formData.title || formData.tm_mark_text || formData.work_title,
        abstract: formData.abstract,
        detailed_description: formData.detailed_description,
        claims: formData.claims,
        features: formData.features,
        prior_art: formData.prior_art,
        problem: formData.problem,
        solution: formData.solution,
        cn_type: formData.cn_type as 'invention' | 'utility_model' | 'design',
        tm_mark_text: formData.tm_mark_text,
        tm_mark_type: formData.tm_mark_type as 'word' | 'device' | 'combined',
        tm_classes: formData.tm_classes.length > 0 ? formData.tm_classes : null,
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('filings')
        .insert([filingData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Filing created successfully!');
      navigate(`/filing/${data.id}`);
    } catch (error: any) {
      console.error('Error creating filing:', error);
      toast.error('Failed to create filing: ' + error.message);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                IP Type & Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>IP Type</Label>
                <RadioGroup value={formData.type} onValueChange={(value) => updateFormData('type', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="patent" id="patent" />
                    <Label htmlFor="patent">Patent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trademark" id="trademark" />
                    <Label htmlFor="trademark">Trademark</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="copyright" id="copyright" />
                    <Label htmlFor="copyright">Copyright</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Filing Route</Label>
                <Select value={formData.route} onValueChange={(value) => updateFormData('route', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="pct">PCT</SelectItem>
                    <SelectItem value="paris">Paris Convention</SelectItem>
                    <SelectItem value="madrid">Madrid (Trademarks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Jurisdiction (ISO-2)</Label>
                <Select value={formData.country_code} onValueChange={(value) => updateFormData('country_code', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="EP">European Patent Office</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Priority Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.priority_date}
                  onChange={(e) => updateFormData('priority_date', e.target.value)}
                />
              </div>

              {formData.country_code === 'CN' && formData.type === 'patent' && (
                <div className="space-y-3">
                  <Label>China Patent Type</Label>
                  <Select value={formData.cn_type} onValueChange={(value) => updateFormData('cn_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invention">Invention Patent</SelectItem>
                      <SelectItem value="utility_model">Utility Model</SelectItem>
                      <SelectItem value="design">Design Patent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        if (formData.type === 'patent') {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Patent Specification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="Invention title"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Abstract</Label>
                  <Textarea
                    value={formData.abstract}
                    onChange={(e) => updateFormData('abstract', e.target.value)}
                    placeholder="Brief summary of the invention"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Problem</Label>
                  <Textarea
                    value={formData.problem}
                    onChange={(e) => updateFormData('problem', e.target.value)}
                    placeholder="What problem does this invention solve?"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Solution</Label>
                  <Textarea
                    value={formData.solution}
                    onChange={(e) => updateFormData('solution', e.target.value)}
                    placeholder="How does your invention solve the problem?"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Detailed Description</Label>
                  <Textarea
                    value={formData.detailed_description}
                    onChange={(e) => updateFormData('detailed_description', e.target.value)}
                    placeholder="Detailed technical description"
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Claims (one per line)</Label>
                  <Textarea
                    value={formData.claims}
                    onChange={(e) => updateFormData('claims', e.target.value)}
                    placeholder="1. A method comprising...&#10;2. The method of claim 1, further comprising..."
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Key Features</Label>
                  <Textarea
                    value={formData.features}
                    onChange={(e) => updateFormData('features', e.target.value)}
                    placeholder="Key technical features"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Prior Art (optional)</Label>
                  <Textarea
                    value={formData.prior_art}
                    onChange={(e) => updateFormData('prior_art', e.target.value)}
                    placeholder="Known prior art and how this invention differs"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          );
        } else if (formData.type === 'trademark') {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Trademark Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Mark Text</Label>
                  <Input
                    value={formData.tm_mark_text}
                    onChange={(e) => updateFormData('tm_mark_text', e.target.value)}
                    placeholder="Your trademark name"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Mark Type</Label>
                  <Select value={formData.tm_mark_type} onValueChange={(value) => updateFormData('tm_mark_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="word">Word Mark</SelectItem>
                      <SelectItem value="design">Design/Logo</SelectItem>
                      <SelectItem value="combined">Combined Word/Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Goods/Services Description</Label>
                  <Textarea
                    value={formData.solution}
                    onChange={(e) => updateFormData('solution', e.target.value)}
                    placeholder="Describe the goods or services this mark will represent"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>International Classes (comma-separated numbers)</Label>
                  <Input
                    placeholder="e.g., 9, 42"
                    onChange={(e) => {
                      const classes = e.target.value.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
                      updateFormData('tm_classes', classes);
                    }}
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tm_classes.map(cls => (
                      <Badge key={cls} variant="outline">Class {cls}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        } else if (formData.type === 'copyright') {
          return (
            <Card>
              <CardHeader>
                <CardTitle>Copyright Work Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Work Title</Label>
                  <Input
                    value={formData.work_title}
                    onChange={(e) => updateFormData('work_title', e.target.value)}
                    placeholder="Title of your creative work"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Work Type</Label>
                  <Select value={formData.work_type} onValueChange={(value) => updateFormData('work_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="literary">Literary Work</SelectItem>
                      <SelectItem value="musical">Musical Work</SelectItem>
                      <SelectItem value="artistic">Artistic Work</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="audiovisual">Audiovisual Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Work Description</Label>
                  <Textarea
                    value={formData.solution}
                    onChange={(e) => updateFormData('solution', e.target.value)}
                    placeholder="Describe your creative work"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Authorship Description</Label>
                  <Textarea
                    value={formData.authorship_description}
                    onChange={(e) => updateFormData('authorship_description', e.target.value)}
                    placeholder="Describe your role in creating this work"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          );
        }
        break;

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Filing Summary</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p><strong>Type:</strong> {formData.type}</p>
                    <p><strong>Route:</strong> {formData.route}</p>
                    <p><strong>Country:</strong> {formData.country_code}</p>
                    <p><strong>Title:</strong> {formData.title || formData.tm_mark_text || formData.work_title}</p>
                    {formData.priority_date && <p><strong>Priority Date:</strong> {formData.priority_date}</p>}
                    {formData.country_code === 'CN' && formData.type === 'patent' && (
                      <p><strong>CN Type:</strong> {formData.cn_type}</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Your filing will be saved as a draft</li>
                    <li>• You can generate patent PDFs and drawings</li>
                    <li>• Ready-to-file packages will be prepared</li>
                    <li>• Deadlines will be automatically tracked</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create a Filing</h1>
          <p className="text-muted-foreground">Step {step} of 3</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            Back
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!formData.type || (step === 2 && !formData.title && !formData.tm_mark_text && !formData.work_title)}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Create Filing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IPGenieWizard;