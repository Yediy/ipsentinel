import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowLeft, ArrowRight, Lightbulb, Building, Palette, Code, Music, FileImage, Check, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PatentInterviewWizard from "@/components/patent/PatentInterviewWizard";
import PatentReviewPanel from "@/components/patent/PatentReviewPanel";
import TrademarkInterviewWizard from "@/components/trademark/TrademarkInterviewWizard";
import CopyrightInterviewWizard from "@/components/copyright/CopyrightInterviewWizard";

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

interface TrademarkData {
  email: string;
  markName: string;
  markType: string;
  businessDescription: string;
  goodsServices: string;
  useInCommerce: string;
  firstUseDate: string;
  intendedUse: string;
  logo?: string;
  slogan?: string;
  colors?: string;
  similarMarks: string;
  marketingChannels: string;
  targetAudience: string;
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

interface GeneratedContent {
  abstract: string;
  background: string;
  summary: string;
  detailed_description: string;
  claims: string[];
  drawings_description?: string;
}

const FilingWizard = () => {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("review");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [patentData, setPatentData] = useState<PatentData | null>(null);
  const [trademarkData, setTrademarkData] = useState<TrademarkData | null>(null);
  const [copyrightData, setCopyrightData] = useState<CopyrightData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [wizardMode, setWizardMode] = useState<'select' | 'patent-interview' | 'patent-review' | 'trademark-interview' | 'copyright-interview' | 'payment'>('select');
  const [formData, setFormData] = useState({
    creationType: "",
    regions: [],
    email: "",
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
    { 
      id: "patent", 
      label: "Patent (Utility)", 
      icon: Lightbulb, 
      desc: "Inventions, processes, machines, software methods",
      detailed: "Protect how your invention works and its unique functionality"
    },
    { 
      id: "brand", 
      label: "Trademark", 
      icon: Building, 
      desc: "Brand names, logos, slogans, trade dress",
      detailed: "Protect your brand identity in the marketplace"
    },
    { 
      id: "creative", 
      label: "Copyright", 
      icon: Palette, 
      desc: "Creative works, software code, writings, art",
      detailed: "Protect original creative expressions and content"
    },
    { 
      id: "design", 
      label: "Design Patent", 
      icon: Code, 
      desc: "Product appearance, ornamental designs",
      detailed: "Protect the visual appearance of your product"
    },
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
    if (formData.creationType === 'patent') {
      setWizardMode('patent-interview');
    } else if (formData.creationType === 'brand') {
      setWizardMode('trademark-interview');
    } else if (formData.creationType === 'creative') {
      setWizardMode('copyright-interview');
    } else if (step < 4) {
      setStep(step + 1);
    }
  };

  const handlePatentInterviewComplete = (data: PatentData) => {
    setPatentData(data);
    setWizardMode('patent-review');
  };

  const handlePatentReviewComplete = (data: PatentData, content: GeneratedContent) => {
    setPatentData(data);
    setGeneratedContent(content);
    setWizardMode('payment');
  };

  const handleTrademarkInterviewComplete = (data: TrademarkData) => {
    setTrademarkData(data);
    setWizardMode('payment');
  };

  const handleCopyrightInterviewComplete = (data: CopyrightData) => {
    setCopyrightData(data);
    setWizardMode('payment');
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

  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: 49,
      description: "AI Analysis Only",
      features: [
        "AI-powered IP analysis",
        "Protection recommendations",
        "Digital report delivery",
        "Basic filing guidance"
      ]
    },
    {
      id: "review",
      name: "Review Plan", 
      price: 129,
      description: "AI Analysis + Legal Review",
      features: [
        "Everything in Basic Plan",
        "Expert attorney review",
        "Filing strategy consultation",
        "Priority support",
        "Risk assessment"
      ],
      popular: true
    },
    {
      id: "bundle",
      name: "Bundle Plan",
      price: 199, 
      description: "Complete Protection Package",
      features: [
        "Everything in Review Plan",
        "Full filing preparation",
        "Government fee guidance",
        "1-year IP monitoring",
        "Ongoing legal support"
      ]
    }
  ];

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      let filingData;
      
      if (patentData && generatedContent) {
        // Use patent interview data
        filingData = {
          type: 'patent',
          country: 'US',
          title: patentData.inventionTitle,
          problem: patentData.problemDescription,
          solution: patentData.solutionDescription,
          components: patentData.components.split(',').map(c => c.trim()),
          generated_content: generatedContent
        };
      } else if (trademarkData) {
        // Use trademark interview data  
        filingData = {
          type: 'trademark',
          country: 'US',
          title: trademarkData.markName,
          problem: trademarkData.businessDescription,
          solution: trademarkData.goodsServices,
          components: [trademarkData.markType]
        };
      } else if (copyrightData) {
        // Use copyright interview data
        filingData = {
          type: 'copyright',
          country: 'US', 
          title: copyrightData.workTitle,
          problem: copyrightData.workDescription,
          solution: copyrightData.registrationPurpose,
          components: [copyrightData.workType]
        };
      } else {
        // Use legacy form data
        filingData = {
          type: formData.creationType,
          country: formData.regions[0] || 'US',
          title: formData.title || formData.brandName,
          problem: formData.problemSolved || formData.brandCategory,
          solution: formData.description || formData.keyFeatures,
          components: formData.workType ? [formData.workType] : []
        };
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          plan: selectedPlan,
          filingData,
          contactEmail: patentData?.email || trademarkData?.email || copyrightData?.email || formData.email
        }
      });
      
      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Render patent interview wizard
  if (wizardMode === 'patent-interview') {
    return <PatentInterviewWizard onComplete={handlePatentInterviewComplete} />;
  }

  // Render patent review panel
  if (wizardMode === 'patent-review' && patentData) {
    return <PatentReviewPanel patentData={patentData} onProceedToPayment={handlePatentReviewComplete} />;
  }

  // Render trademark interview wizard
  if (wizardMode === 'trademark-interview') {
    return <TrademarkInterviewWizard onComplete={handleTrademarkInterviewComplete} />;
  }

  // Render copyright interview wizard
  if (wizardMode === 'copyright-interview') {
    return <CopyrightInterviewWizard onComplete={handleCopyrightInterviewComplete} />;
  }

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
              <span className="text-2xl font-bold text-legal-dark">IPGenie</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {wizardMode === 'payment' ? 'Review & Payment' : `Step ${step} of 4`}
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

          {/* Step 1: What type of IP protection do you need? */}
          {step === 1 && wizardMode === 'select' && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  What type of IP protection do you need?
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Choose the type that best describes what you want to protect
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
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{type.label}</h3>
                            <p className="text-muted-foreground text-sm mb-3">{type.desc}</p>
                            <p className="text-xs text-primary font-medium">{type.detailed}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {formData.creationType === 'patent' && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Patent Interview Process</h4>
                        <p className="text-sm text-muted-foreground">
                          You'll go through an AI-guided interview to capture all the details about your invention. 
                          Our system will then generate a complete patent application including claims, abstract, 
                          and detailed description.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.creationType === 'brand' && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start space-x-3">
                      <Building className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Trademark Interview Process</h4>
                        <p className="text-sm text-muted-foreground">
                          Our AI will guide you through trademark requirements, perform conflict searches, 
                          and generate your USPTO application with proper classifications.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.creationType === 'creative' && (
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start space-x-3">
                      <Palette className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-primary mb-1">Copyright Interview Process</h4>
                        <p className="text-sm text-muted-foreground">
                          We'll collect details about your creative work, help with classification, 
                          and prepare your copyright registration forms.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end mt-8">
                  <Button 
                    onClick={handleNext}
                    disabled={!formData.creationType}
                    className="px-8"
                  >
                    {formData.creationType === 'patent' ? 'Start Patent Interview' : 
                     formData.creationType === 'brand' ? 'Start Trademark Interview' :
                     formData.creationType === 'creative' ? 'Start Copyright Interview' : 'Continue'}
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
                  <div>
                    <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>
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

          {/* Payment Step - can be reached from patent review or regular flow */}
          {(step === 4 || wizardMode === 'payment') && (
            <Card className="shadow-feature">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-legal-dark">
                  {wizardMode === 'payment' && patentData ? 
                    `Choose Your Plan for "${patentData.inventionTitle}"` :
                   wizardMode === 'payment' && trademarkData ?
                    `Choose Your Plan for "${trademarkData.markName}"` :
                   wizardMode === 'payment' && copyrightData ?
                    `Choose Your Plan for "${copyrightData.workTitle}"` :
                    'Choose Your Protection Plan'
                  }
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  {wizardMode === 'payment' && patentData ?
                    'Your patent application is ready. Select a plan to proceed with filing.' :
                   wizardMode === 'payment' && trademarkData ?
                    'Your trademark application details are complete. Choose your filing plan.' :
                   wizardMode === 'payment' && copyrightData ?
                    'Your copyright registration is ready. Select your service level.' :
                    'Select the level of service that best fits your needs'
                  }
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

                {/* Plan Selection */}
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-4">Choose Your Plan</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-card ${
                          selectedPlan === plan.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        {plan.popular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                          </div>
                        )}
                        <div className="text-center mb-4">
                          <h5 className="font-semibold text-lg">{plan.name}</h5>
                          <div className="text-2xl font-bold text-primary">${plan.price}</div>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <ul className="space-y-2 text-sm">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        {selectedPlan === plan.id && (
                          <div className="absolute top-3 right-3">
                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-lg mb-4">Selected Plan Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
                      <span className="font-semibold">${plans.find(p => p.id === selectedPlan)?.price}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${plans.find(p => p.id === selectedPlan)?.price}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-2">What's included in {plans.find(p => p.id === selectedPlan)?.name}:</h4>
                  <ul className="text-sm space-y-1">
                    {plans.find(p => p.id === selectedPlan)?.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevious}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    className="px-8" 
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Proceed to Payment
                      </>
                    )}
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