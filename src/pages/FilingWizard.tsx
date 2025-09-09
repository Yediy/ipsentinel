import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowLeft, ArrowRight, Lightbulb, Building, Palette, Code, Music, FileImage } from "lucide-react";
import { Link } from "react-router-dom";

const FilingWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    creationType: "",
    regions: [],
    title: "",
    description: "",
    problemSolved: "",
    keyFeatures: "",
    brandName: "",
    brandCategory: "",
    workType: "",
    published: "",
    isOriginalCreator: true,
    commercialRights: false,
    globalLicensing: false,
  });

  const creationTypes = [
    { id: "invention", label: "Invention/Device", icon: Lightbulb, desc: "Physical products, software, processes" },
    { id: "brand", label: "Brand/Logo", icon: Building, desc: "Company names, logos, slogans" },
    { id: "creative", label: "Creative Work", icon: Palette, desc: "Art, music, writing, design" },
    { id: "software", label: "Software/Code", icon: Code, desc: "Applications, algorithms, source code" },
  ];

  const regions = [
    { id: "usa", label: "United States", cost: "$320" },
    { id: "canada", label: "Canada", cost: "$400" },
    { id: "eu", label: "European Union", cost: "$1,200" },
    { id: "wipo", label: "Global (WIPO)", cost: "$1,400" },
  ];

  const workTypes = [
    { id: "music", label: "Music", icon: Music },
    { id: "art", label: "Visual Art", icon: Palette },
    { id: "writing", label: "Writing/Books", icon: FileImage },
    { id: "software", label: "Software", icon: Code },
    { id: "design", label: "Design", icon: Building },
    { id: "other", label: "Other", icon: Lightbulb },
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleRegion = (regionId: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(regionId)
        ? prev.regions.filter(r => r !== regionId)
        : [...prev.regions, regionId]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <Link to="/dashboard" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-legal-dark">IPSentinel</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {step} of 4
            </div>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round((step / 4) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step 1: What did you create? */}
          {step === 1 && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  What did you create?
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Choose the type that best describes your creation
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {creationTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-card ${
                          formData.creationType === type.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => updateFormData('creationType', type.id)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="bg-primary/10 p-3 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{type.label}</h3>
                            <p className="text-muted-foreground">{type.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-8">
                  <Button 
                    onClick={handleNext}
                    disabled={!formData.creationType}
                    className="px-8"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Where do you want protection? */}
          {step === 2 && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  Where do you want protection?
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Select all regions where you want IP protection (you can add more later)
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-4">
                  {regions.map((region) => (
                    <div
                      key={region.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-card ${
                        formData.regions.includes(region.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleRegion(region.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{region.label}</h3>
                          <p className="text-sm text-muted-foreground">Government fee: {region.cost}</p>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          formData.regions.includes(region.id) 
                            ? 'bg-primary border-primary' 
                            : 'border-border'
                        }`}>
                          {formData.regions.includes(region.id) && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={handlePrevious}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={formData.regions.length === 0}
                    className="px-8"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Tell us about your creation */}
          {step === 3 && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  Tell us about your creation
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Provide details so our AI can generate the best protection for you
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {formData.creationType === 'invention' && (
                    <>
                      <div>
                        <Label htmlFor="title" className="text-base font-semibold">Invention Title</Label>
                        <Input 
                          id="title"
                          placeholder="e.g., Smart Home Security System"
                          value={formData.title}
                          onChange={(e) => updateFormData('title', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-base font-semibold">How does it work?</Label>
                        <Textarea 
                          id="description"
                          placeholder="Describe your invention in simple terms..."
                          value={formData.description}
                          onChange={(e) => updateFormData('description', e.target.value)}
                          className="mt-2 min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="problemSolved" className="text-base font-semibold">What problem does it solve?</Label>
                        <Textarea 
                          id="problemSolved"
                          placeholder="Explain the problem and how your invention solves it..."
                          value={formData.problemSolved}
                          onChange={(e) => updateFormData('problemSolved', e.target.value)}
                          className="mt-2 min-h-[100px]"
                        />
                      </div>
                    </>
                  )}

                  {formData.creationType === 'brand' && (
                    <>
                      <div>
                        <Label htmlFor="brandName" className="text-base font-semibold">Brand Name</Label>
                        <Input 
                          id="brandName"
                          placeholder="e.g., TechGuard"
                          value={formData.brandName}
                          onChange={(e) => updateFormData('brandName', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="brandCategory" className="text-base font-semibold">What does your brand represent?</Label>
                        <Input 
                          id="brandCategory"
                          placeholder="e.g., Security software, Consulting services, etc."
                          value={formData.brandCategory}
                          onChange={(e) => updateFormData('brandCategory', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}

                  {formData.creationType === 'creative' && (
                    <>
                      <div>
                        <Label className="text-base font-semibold">Type of creative work</Label>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {workTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                              <div
                                key={type.id}
                                className={`border rounded-lg p-3 cursor-pointer text-center transition-all hover:shadow-card ${
                                  formData.workType === type.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => updateFormData('workType', type.id)}
                              >
                                <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                                <div className="text-sm">{type.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="title" className="text-base font-semibold">Work Title</Label>
                        <Input 
                          id="title"
                          placeholder="e.g., My Original Song"
                          value={formData.title}
                          onChange={(e) => updateFormData('title', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="originalCreator"
                        checked={formData.isOriginalCreator}
                        onCheckedChange={(checked) => updateFormData('isOriginalCreator', checked)}
                      />
                      <Label htmlFor="originalCreator">I am the original creator of this work</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="commercialRights"
                        checked={formData.commercialRights}
                        onCheckedChange={(checked) => updateFormData('commercialRights', checked)}
                      />
                      <Label htmlFor="commercialRights">I want exclusive commercial rights</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="globalLicensing"
                        checked={formData.globalLicensing}
                        onCheckedChange={(checked) => updateFormData('globalLicensing', checked)}
                      />
                      <Label htmlFor="globalLicensing">I plan to license this globally</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={handlePrevious}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!formData.title && !formData.brandName}
                    className="px-8"
                  >
                    Generate AI Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: AI Recommendation */}
          {step === 4 && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  AI Recommendation
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Based on your answers, here's what we recommend
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-legal-dark mb-2">
                        Recommended Protection: {formData.creationType === 'invention' ? 'Patent' : 
                        formData.creationType === 'brand' ? 'Trademark' : 'Copyright'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {formData.creationType === 'invention' 
                          ? 'Your invention qualifies for patent protection. This will give you exclusive rights to make, use, and sell your invention.'
                          : formData.creationType === 'brand'
                          ? 'Your brand name and logo should be protected with a trademark to prevent others from using similar marks in your industry.'
                          : 'Your creative work is eligible for copyright protection, giving you exclusive rights to reproduce, distribute, and display your work.'
                        }
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Recommended</Badge>
                        {formData.regions.map(region => (
                          <Badge key={region} variant="outline">{region.toUpperCase()}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-lg mb-4">Cost Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>IPSentinel Service Fee</span>
                      <span className="font-semibold">$129</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Government Filing Fees</span>
                      <span className="font-semibold">$320</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">$449</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-2">What's included:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• AI-generated filing documents</li>
                    <li>• USPTO compliance review</li>
                    <li>• Attorney review before submission</li>
                    <li>• Filing status tracking</li>
                    <li>• 1-year IP monitoring</li>
                  </ul>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevious}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button className="px-8">
                    Proceed to Payment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilingWizard;